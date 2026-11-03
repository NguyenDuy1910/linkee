import "server-only";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { db } from "@/lib/db";
import { isPublicHttpsAppUrl } from "@/lib/env";
import type { Job, MediaAsset, PostTarget, Prisma, SocialAccount, TargetStatus } from "@/lib/generated/prisma/client";
import { enqueueJob, PermanentJobError, type JobHandler, type JobResult } from "@/lib/jobs";
import { publicMediaUrl, toMediaDTO, type MediaDTO } from "@/lib/media";
import { UPGRADE_MESSAGE } from "@/lib/plans";
import {
  MAX_CAPTION_LENGTH,
  MAX_MEDIA,
  PROVIDER_LABELS,
  PUBLIC_MEDIA_URL_MESSAGE,
  validateForProvider,
  type PublishProvider,
} from "@/lib/publishing-rules";
import type { CurrentUser } from "@/lib/session";
import { publishToPage, type PublishMedia } from "@/lib/social/facebook";
import {
  createInstagramContainers,
  getContainerStatus,
  getPermalink,
  getPublishingQuota,
  publishContainer,
} from "@/lib/social/instagram-publish";
import { describeMetaError, MetaApiError } from "@/lib/social/meta";
import { getAccessToken, noteProviderError, ReconnectRequiredError } from "@/lib/social/tokens";

/**
 * Post to All.
 *
 * Drafts store caption + ordered media only. The schema has no draft-destinations table, so
 * destinations are chosen in the composer at publish time (PostTarget rows exist only once a
 * post is submitted). Submitting writes the post, one PostTarget per destination and one
 * durable job per target in a single transaction; each target then publishes, fails and
 * retries independently.
 */

export const PUBLISH_JOB_TYPE = "post.publishTarget";
const PUBLISH_MAX_ATTEMPTS = 4;
/** Instagram video processing: poll every 10s, give up 20 minutes after the job was queued. */
const IG_POLL_MS = 10_000;
const IG_PROCESSING_LIMIT_MS = 20 * 60_000;

// ───────────────────────────── Input schemas ─────────────────────────────

const id = z.string().trim().min(1).max(64);

export const draftInputSchema = z.object({
  postId: id.optional(),
  caption: z
    .string()
    .trim()
    .max(MAX_CAPTION_LENGTH, `Captions can be at most ${MAX_CAPTION_LENGTH.toLocaleString("en-US")} characters.`),
  mediaIds: z
    .array(id)
    .max(MAX_MEDIA, `Add at most ${MAX_MEDIA} photos or videos.`)
    .refine((ids) => new Set(ids).size === ids.length, "The same file was added twice."),
});
export type DraftInput = z.infer<typeof draftInputSchema>;

export const submitInputSchema = draftInputSchema.extend({
  accountIds: z
    .array(id)
    .min(1, "Choose at least one destination.")
    .max(50)
    .transform((ids) => [...new Set(ids)]),
});
export type SubmitInput = z.infer<typeof submitInputSchema>;

/** User-facing failure raised inside transactions; rolls back and becomes `fail(message)`. */
class PublishError extends Error {}

// ───────────────────────────── Read models for the UI ─────────────────────────────

export interface PublishAccountDTO {
  id: string;
  provider: PublishProvider;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  status: "ACTIVE" | "NEEDS_RECONNECT";
  statusMessage: string | null;
}

export interface DraftDTO {
  id: string;
  caption: string;
  media: MediaDTO[];
}

export interface TargetDTO {
  id: string;
  provider: PublishProvider;
  accountName: string;
  status: TargetStatus;
  remoteUrl: string | null;
  error: string | null;
  publishedAt: Date | null;
}

export interface PostHistoryItem {
  id: string;
  caption: string;
  status: "DRAFT" | "SUBMITTED";
  createdAt: Date;
  submittedAt: Date | null;
  cover: { kind: "IMAGE" | "VIDEO"; url: string } | null;
  mediaCount: number;
  targets: TargetDTO[];
}

/** Connected Instagram accounts and Facebook Pages (no token fields). */
export async function listPublishAccounts(userId: string): Promise<PublishAccountDTO[]> {
  const rows = await db.socialAccount.findMany({
    where: { userId, provider: { in: ["INSTAGRAM", "FACEBOOK"] } },
    orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
    select: { id: true, provider: true, displayName: true, username: true, avatarUrl: true, status: true, statusMessage: true },
  });
  return rows.map((a) => ({
    id: a.id,
    provider: a.provider,
    name: accountLabel(a),
    username: a.username,
    avatarUrl: a.avatarUrl,
    status: a.status,
    statusMessage: a.statusMessage,
  }));
}

export async function getDraft(userId: string, postId: string): Promise<DraftDTO | null> {
  const post = await db.post.findFirst({
    where: { id: postId, userId, status: "DRAFT" },
    include: { media: { orderBy: { position: "asc" }, include: { media: true } } },
  });
  return post ? { id: post.id, caption: post.caption, media: post.media.map((pm) => toMediaDTO(pm.media)) } : null;
}

/** Latest 20 posts, drafts first. */
export async function listRecentPosts(userId: string): Promise<PostHistoryItem[]> {
  const posts = await db.post.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 20,
    include: {
      media: { orderBy: { position: "asc" }, include: { media: true } },
      targets: { orderBy: { createdAt: "asc" } },
    },
  });
  return posts.map((p) => {
    const first = p.media[0]?.media;
    return {
      id: p.id,
      caption: p.caption,
      status: p.status,
      createdAt: p.createdAt,
      submittedAt: p.submittedAt,
      cover: first ? { kind: first.kind, url: toMediaDTO(first).url } : null,
      mediaCount: p.media.length,
      targets: p.targets.map((t) => ({
        id: t.id,
        provider: t.provider,
        accountName: t.accountName,
        status: t.status,
        remoteUrl: t.remoteUrl,
        error: t.error,
        publishedAt: t.publishedAt,
      })),
    };
  });
}

// ───────────────────────────── Commands ─────────────────────────────

function accountLabel(a: Pick<SocialAccount, "provider" | "displayName" | "username">): string {
  return a.provider === "INSTAGRAM" && a.username ? `@${a.username}` : a.displayName;
}

/** Owned media in the requested order, or null if any id is missing / not the user's. */
async function loadOwnedMedia(userId: string, mediaIds: readonly string[]): Promise<MediaAsset[] | null> {
  if (mediaIds.length === 0) return [];
  const rows = await db.mediaAsset.findMany({ where: { id: { in: [...mediaIds] }, userId } });
  const byId = new Map(rows.map((m) => [m.id, m]));
  const ordered = mediaIds.map((mid) => byId.get(mid));
  return ordered.every(Boolean) ? (ordered as MediaAsset[]) : null;
}

const MISSING_MEDIA = "Some media is no longer available. Remove it and upload it again.";

/** Writes caption + ordered media to a new post or an existing DRAFT the user owns. */
async function writePostContent(
  tx: Prisma.TransactionClient,
  userId: string,
  input: DraftInput,
  extra: { status: "DRAFT" } | { status: "SUBMITTED"; submittedAt: Date },
): Promise<string> {
  let postId: string;
  if (input.postId) {
    // Status guard makes a second submit (double click, second tab) a no-op failure.
    const { count } = await tx.post.updateMany({
      where: { id: input.postId, userId, status: "DRAFT" },
      data: { caption: input.caption, ...extra },
    });
    if (count === 0) throw new PublishError("This post was already published or deleted. Start a new post.");
    await tx.postMedia.deleteMany({ where: { postId: input.postId } });
    postId = input.postId;
  } else {
    postId = (await tx.post.create({ data: { userId, caption: input.caption, ...extra }, select: { id: true } })).id;
  }
  if (input.mediaIds.length > 0) {
    await tx.postMedia.createMany({
      data: input.mediaIds.map((mediaAssetId, position) => ({ postId, mediaAssetId, position })),
    });
  }
  return postId;
}

async function runCommand<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof PublishError) return fail(err.message);
    throw err;
  }
}

export async function saveDraft(user: CurrentUser, input: DraftInput): Promise<ActionResult<{ postId: string }>> {
  if (!input.caption && input.mediaIds.length === 0) return fail("Add a caption or media before saving a draft.");
  if (!(await loadOwnedMedia(user.id, input.mediaIds))) return fail(MISSING_MEDIA);
  return runCommand(async () => ({
    postId: await db.$transaction((tx) => writePostContent(tx, user.id, input, { status: "DRAFT" })),
  }));
}

/**
 * Validates every destination server-side, then atomically marks the post SUBMITTED, creates
 * one PENDING target per destination and queues one publish job per target.
 */
export async function submitPost(
  user: CurrentUser,
  input: SubmitInput,
): Promise<ActionResult<{ postId: string; targetCount: number }>> {
  if (!user.entitlements.publishing) return fail(UPGRADE_MESSAGE);

  const accounts = await db.socialAccount.findMany({
    where: { id: { in: input.accountIds }, userId: user.id, provider: { in: ["INSTAGRAM", "FACEBOOK"] } },
    select: { id: true, provider: true, displayName: true, username: true, status: true },
  });
  if (accounts.length !== input.accountIds.length) {
    return fail("One of the selected accounts is no longer connected. Refresh the page and try again.");
  }
  const disconnected = accounts.filter((a) => a.status !== "ACTIVE");
  if (disconnected.length > 0) {
    return fail(`Reconnect ${disconnected.map(accountLabel).join(", ")} in Settings before publishing.`);
  }

  const media = await loadOwnedMedia(user.id, input.mediaIds);
  if (!media) return fail(MISSING_MEDIA);

  const problems: string[] = [];
  if (media.length > 0 && !isPublicHttpsAppUrl()) problems.push(PUBLIC_MEDIA_URL_MESSAGE);
  for (const account of accounts) {
    const { errors } = validateForProvider(account.provider, { caption: input.caption, media });
    for (const error of errors) problems.push(`${PROVIDER_LABELS[account.provider]} · ${accountLabel(account)}: ${error}`);
  }
  if (problems.length > 0) return fail(problems.join("\n"));

  return runCommand(() =>
    db.$transaction(async (tx) => {
      const postId = await writePostContent(tx, user.id, input, { status: "SUBMITTED", submittedAt: new Date() });
      for (const account of accounts) {
        // Unique (postId, socialAccountId) rules out duplicate destinations.
        const target = await tx.postTarget.create({
          data: { postId, socialAccountId: account.id, provider: account.provider, accountName: accountLabel(account) },
          select: { id: true },
        });
        await enqueueJob(
          PUBLISH_JOB_TYPE,
          { targetId: target.id },
          { dedupeKey: `publish:${target.id}:0`, maxAttempts: PUBLISH_MAX_ATTEMPTS },
          tx,
        );
      }
      return { postId, targetCount: accounts.length };
    }),
  );
}

/** Re-queues one FAILED destination. Successful destinations are never touched. */
export async function retryTarget(user: CurrentUser, targetId: string): Promise<ActionResult> {
  if (!user.entitlements.publishing) return fail(UPGRADE_MESSAGE);
  const target = await db.postTarget.findFirst({
    where: { id: targetId, post: { userId: user.id } },
    select: { id: true, status: true, attempts: true, accountName: true, socialAccount: { select: { status: true } } },
  });
  if (!target) return fail("This post no longer exists.");
  if (target.status !== "FAILED") return fail("Only failed destinations can be retried.");
  if (!target.socialAccount) {
    return fail(`${target.accountName} was disconnected from Linkee. Connect it again and create a new post.`);
  }
  if (target.socialAccount.status !== "ACTIVE") return fail(`Reconnect ${target.accountName} in Settings, then retry.`);

  const result = await runCommand(() =>
    db.$transaction(async (tx) => {
      const { count } = await tx.postTarget.updateMany({
        where: { id: target.id, status: "FAILED" },
        data: { status: "PENDING", error: null },
      });
      if (count === 0) throw new PublishError("This destination is already being retried.");
      // `attempts` grows on every claim, so each retry gets a fresh idempotency key.
      const queued = await enqueueJob(
        PUBLISH_JOB_TYPE,
        { targetId: target.id },
        { dedupeKey: `publish:${target.id}:${target.attempts}`, maxAttempts: PUBLISH_MAX_ATTEMPTS },
        tx,
      );
      if (!queued) throw new PublishError("This destination is already being retried.");
    }),
  );
  return result.ok ? ok() : result;
}

export async function deleteDraft(user: CurrentUser, postId: string): Promise<ActionResult> {
  const { count } = await db.post.deleteMany({ where: { id: postId, userId: user.id, status: "DRAFT" } });
  return count === 0 ? fail("Only drafts can be deleted.") : ok();
}

// ───────────────────────────── Worker ─────────────────────────────

const payloadSchema = z.object({ targetId: z.string().min(1) });

async function failTarget(targetId: string, error: string): Promise<void> {
  await db.postTarget.update({ where: { id: targetId }, data: { status: "FAILED", error: error.slice(0, 1000) } });
}

async function markPublished(targetId: string, remotePostId: string | null, remoteUrl: string | null): Promise<void> {
  await db.postTarget.update({
    where: { id: targetId },
    data: { status: "PUBLISHED", remotePostId, remoteUrl, publishedAt: new Date(), error: null },
  });
}

/**
 * Job "post.publishTarget" ({ targetId }). Idempotent: PUBLISHED targets are skipped,
 * Instagram containers are reused, and a Facebook request interrupted mid-flight is never
 * blindly repeated.
 */
export const handlePublishTarget: JobHandler = async (payload, job) => {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) throw new PermanentJobError("Invalid post.publishTarget payload");

  const target = await db.postTarget.findUnique({
    where: { id: parsed.data.targetId },
    include: {
      socialAccount: true,
      post: { include: { media: { orderBy: { position: "asc" }, include: { media: true } } } },
    },
  });
  // Post deleted, already done, or failed and awaiting a manual retry.
  if (!target || target.status === "PUBLISHED" || target.status === "FAILED") return;

  if (target.status === "PENDING") {
    const { count } = await db.postTarget.updateMany({
      where: { id: target.id, status: "PENDING" },
      data: { status: "PUBLISHING", attempts: { increment: 1 } },
    });
    if (count === 0) return;
  } else if (target.provider === "FACEBOOK") {
    // PUBLISHING on entry means a previous run stopped mid-request; the post may exist.
    await failTarget(
      target.id,
      "We couldn't confirm whether this post reached Facebook. Check your Page before retrying.",
    );
    return;
  }
  // Instagram targets already PUBLISHING continue: container polling or crash recovery.

  const account = target.socialAccount;
  if (!account) {
    await failTarget(target.id, `${target.accountName} was disconnected from Linkee.`);
    return;
  }
  if (account.status !== "ACTIVE") {
    await failTarget(target.id, `Reconnect ${target.accountName} in Settings, then retry.`);
    return;
  }
  const assets = target.post.media.map((pm) => pm.media);
  if (assets.length > 0 && !isPublicHttpsAppUrl()) {
    await failTarget(target.id, PUBLIC_MEDIA_URL_MESSAGE);
    return;
  }
  const media: PublishMedia[] = assets.map((m) => ({ kind: m.kind, url: publicMediaUrl(m.storageKey) }));
  const caption = target.post.caption;

  try {
    const token = await getAccessToken(account);
    if (target.provider === "FACEBOOK") {
      const res = await publishToPage({ pageId: account.providerAccountId, token, caption, media });
      await markPublished(target.id, res.remotePostId, res.remoteUrl);
      return;
    }
    return await publishInstagram(target, account, token, caption, media, job);
  } catch (err) {
    await handlePublishFailure(target, account, err, job);
  }
};

async function publishInstagram(
  target: PostTarget,
  account: SocialAccount,
  token: string,
  caption: string,
  media: PublishMedia[],
  job: Job,
): Promise<JobResult> {
  const igUserId = account.providerAccountId;
  const profileUrl = account.username ? `https://www.instagram.com/${account.username}/` : null;
  let containerId = target.remoteContainerId;
  let justCreated = false;

  if (!containerId) {
    const quota = await getPublishingQuota(igUserId, token);
    if (quota.used >= quota.total) {
      await failTarget(
        target.id,
        `This Instagram account reached its limit of ${quota.total} API-published posts in 24 hours. Retry later.`,
      );
      return;
    }
    containerId = await createInstagramContainers({ igUserId, token, caption, media });
    // Saved before polling/publishing so a retry reuses it instead of creating a second post.
    await db.postTarget.update({ where: { id: target.id }, data: { remoteContainerId: containerId } });
    justCreated = true;
  }

  let { statusCode, status } = await getContainerStatus(containerId, token);
  // Photos usually finish within seconds; avoid a 10s reschedule for them.
  for (let i = 0; justCreated && statusCode === "IN_PROGRESS" && i < 3; i++) {
    await sleep(2_000);
    ({ statusCode, status } = await getContainerStatus(containerId, token));
  }

  switch (statusCode) {
    case "PUBLISHED":
      // Published by an earlier run that stopped before recording it; the media id is unknown.
      await markPublished(target.id, null, profileUrl);
      return;
    case "ERROR":
    case "EXPIRED":
      await db.postTarget.update({
        where: { id: target.id },
        data: {
          status: "FAILED",
          remoteContainerId: null,
          error: `Instagram couldn't process this media${status ? `: ${status}` : "."} Retry to upload it again.`.slice(0, 1000),
        },
      });
      return;
    case "IN_PROGRESS":
      if (Date.now() - job.createdAt.getTime() > IG_PROCESSING_LIMIT_MS) {
        // Container kept: a manual retry picks it up once Instagram finishes.
        await failTarget(target.id, "Instagram is still processing this video. Try again later.");
        return;
      }
      return { rescheduleInMs: IG_POLL_MS };
    case "FINISHED":
      break;
  }

  const mediaId = await publishContainer(igUserId, containerId, token);
  let permalink: string | null = null;
  try {
    permalink = await getPermalink(mediaId, token);
  } catch (err) {
    console.warn(`[publishing] permalink lookup failed for ${mediaId}: ${describeMetaError(err)}`);
  }
  await markPublished(target.id, mediaId, permalink ?? profileUrl);
}

async function handlePublishFailure(target: PostTarget, account: SocialAccount, err: unknown, job: Job): Promise<void> {
  if (await noteProviderError(account.id, err)) {
    const reason = err instanceof ReconnectRequiredError ? err.message : describeMetaError(err);
    await failTarget(target.id, `Reconnect ${target.accountName} in Settings, then retry. ${reason}`);
    return;
  }
  if (!(err instanceof MetaApiError)) {
    console.error(`[publishing] target ${target.id} failed:`, err);
    await failTarget(target.id, "Something went wrong while publishing. Please retry.");
    return;
  }
  if (target.provider === "FACEBOOK" && err.status === 0) {
    // Timed out or connection dropped: Facebook may have created the post anyway.
    await failTarget(
      target.id,
      `We couldn't confirm whether this post reached Facebook (${err.message}). Check your Page before retrying.`,
    );
    return;
  }
  if (err.isTransient && job.attempts < job.maxAttempts) {
    // Back to PENDING so the job's next attempt claims it again (Instagram reuses its container).
    await db.postTarget.update({
      where: { id: target.id },
      data: { status: "PENDING", error: `${describeMetaError(err)} Retrying automatically…`.slice(0, 1000) },
    });
    throw err;
  }
  await failTarget(target.id, describeMetaError(err));
}
