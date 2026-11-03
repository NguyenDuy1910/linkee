import "server-only";
import { db } from "@/lib/db";
import type { ReplySource, SocialAccount } from "@/lib/generated/prisma/client";
import { listMediaComments, listRecentMedia, replyToComment } from "@/lib/social/instagram";
import { describeMetaError, MetaApiError } from "@/lib/social/meta";
import { getAccessToken, noteProviderError, ReconnectRequiredError } from "@/lib/social/tokens";

/** Core comment sync + reply sending, shared by Inbox actions, webhooks and auto-replies. */

const SYNC_THROTTLE_MS = 60_000;
const SYNC_MEDIA_LIMIT = 10;
const SYNC_COMMENTS_PER_MEDIA = 50;
const REPLY_LOCK_MS = 2 * 60_000;
export const REPLY_MAX_CHARS = 1000;

export type SyncResult =
  | { ok: true; message: string; newCount: number }
  | { ok: false; error: string; needsReconnect: boolean };

/** True when a comment was written by the connected account itself (our own replies). */
export function isOwnComment(
  account: Pick<SocialAccount, "providerAccountId" | "username">,
  author: { igId: string | null; username: string | null },
): boolean {
  if (author.igId && author.igId === account.providerAccountId) return true;
  return Boolean(author.username && account.username && author.username.toLowerCase() === account.username.toLowerCase());
}

/** Pulls comments on the latest posts. Throttled to once a minute per account. */
export async function syncComments(account: SocialAccount): Promise<SyncResult> {
  if (account.provider !== "INSTAGRAM") return { ok: false, error: "Only Instagram accounts have a comment inbox.", needsReconnect: false };
  if (account.lastSyncedAt && Date.now() - account.lastSyncedAt.getTime() < SYNC_THROTTLE_MS) {
    return { ok: true, message: "Synced just now — you're up to date.", newCount: 0 };
  }

  try {
    const token = await getAccessToken(account);
    const media = await listRecentMedia(account.providerAccountId, token, SYNC_MEDIA_LIMIT);
    const perMedia = await Promise.all(
      media.map(async (m) => ({ media: m, comments: await listMediaComments(m.id, token, SYNC_COMMENTS_PER_MEDIA) })),
    );

    const incoming = perMedia.flatMap(({ media: m, comments }) =>
      comments
        .filter((c) => !isOwnComment(account, { igId: c.fromId, username: c.username }))
        .map((c) => ({
          socialAccountId: account.id,
          igCommentId: c.id,
          igMediaId: m.id,
          parentIgCommentId: c.parentId,
          mediaCaption: m.caption,
          mediaPermalink: m.permalink,
          mediaThumbnailUrl: m.thumbnailUrl,
          authorUsername: c.username,
          authorIgId: c.fromId,
          text: c.text,
          commentedAt: c.timestamp ? new Date(c.timestamp) : new Date(),
        })),
    );

    const existing = await db.instagramComment.findMany({
      where: { igCommentId: { in: incoming.map((c) => c.igCommentId) } },
      select: { igCommentId: true, text: true, mediaCaption: true, mediaPermalink: true, mediaThumbnailUrl: true },
    });
    const byId = new Map(existing.map((c) => [c.igCommentId, c]));
    const fresh = incoming.filter((c) => !byId.has(c.igCommentId));
    const changed = incoming.filter((c) => {
      const prev = byId.get(c.igCommentId);
      return (
        prev &&
        (prev.text !== c.text ||
          prev.mediaCaption !== c.mediaCaption ||
          prev.mediaPermalink !== c.mediaPermalink ||
          prev.mediaThumbnailUrl !== c.mediaThumbnailUrl)
      );
    });

    const created = await db.$transaction(async (tx) => {
      const { count } = fresh.length ? await tx.instagramComment.createMany({ data: fresh, skipDuplicates: true }) : { count: 0 };
      for (const c of changed) {
        await tx.instagramComment.update({
          where: { igCommentId: c.igCommentId },
          data: { text: c.text, mediaCaption: c.mediaCaption, mediaPermalink: c.mediaPermalink, mediaThumbnailUrl: c.mediaThumbnailUrl },
        });
      }
      await tx.socialAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
      return count;
    });

    const message =
      media.length === 0
        ? "No posts found on this account yet."
        : created === 0
          ? "You're up to date — no new comments."
          : `${created} new comment${created === 1 ? "" : "s"}.`;
    return { ok: true, message, newCount: created };
  } catch (err) {
    const needsReconnect = await noteProviderError(account.id, err);
    if (err instanceof ReconnectRequiredError) return { ok: false, error: err.message, needsReconnect: true };
    if (err instanceof MetaApiError) {
      console.warn(`[instagram] sync failed for ${account.id}: ${err.message} (code ${err.code ?? "-"})`);
      return { ok: false, error: `Couldn't refresh comments: ${describeMetaError(err)}`, needsReconnect };
    }
    throw err;
  }
}

export type SendReplyResult =
  | { ok: true; reply: { id: string; text: string; sentAt: Date } }
  | {
      ok: false;
      error: string;
      needsReconnect?: boolean;
      /** Safe to retry later: nothing was posted (rate limit, outage, network refused). */
      transient?: boolean;
    };

/**
 * Publishes a reply to an owned comment. Duplicate-safe: an atomic lock prevents parallel
 * submissions and replied comments can't be answered twice.
 */
export async function sendReply(opts: { userId: string; commentId: string; text: string; source: ReplySource }): Promise<SendReplyResult> {
  const text = opts.text.trim();
  if (!text) return { ok: false, error: "Write a reply first." };
  if (text.length > REPLY_MAX_CHARS) return { ok: false, error: `Replies can be at most ${REPLY_MAX_CHARS} characters.` };

  const comment = await db.instagramComment.findFirst({
    where: { id: opts.commentId, socialAccount: { userId: opts.userId } },
    include: { socialAccount: true },
  });
  if (!comment) return { ok: false, error: "This comment no longer exists." };
  if (comment.status === "REPLIED") return { ok: false, error: "This comment already has a reply." };
  const account = comment.socialAccount;
  if (account.status === "NEEDS_RECONNECT") {
    return { ok: false, error: "Reconnect this Instagram account in Settings to send replies.", needsReconnect: true };
  }

  const now = new Date();
  const lock = await db.instagramComment.updateMany({
    where: {
      id: comment.id,
      status: { not: "REPLIED" },
      OR: [{ replyLockedAt: null }, { replyLockedAt: { lt: new Date(now.getTime() - REPLY_LOCK_MS) } }],
    },
    data: { replyLockedAt: now },
  });
  if (lock.count === 0) return { ok: false, error: "A reply is already being sent or was sent." };

  let remoteId: string;
  try {
    const token = await getAccessToken(account);
    remoteId = (await replyToComment(comment.igCommentId, text, token)).id;
  } catch (err) {
    const needsReconnect = await noteProviderError(account.id, err);
    const timedOut = err instanceof MetaApiError && err.status === 0 && /timed out/i.test(err.message);
    const error = timedOut
      ? "Instagram didn't confirm the reply in time. Check the post before trying again."
      : err instanceof ReconnectRequiredError
        ? err.message
        : describeMetaError(err);
    await db.$transaction([
      db.commentReply.create({ data: { commentId: comment.id, text, source: opts.source, status: "FAILED", error: error.slice(0, 1000) } }),
      db.instagramComment.update({ where: { id: comment.id }, data: { replyLockedAt: null } }),
    ]);
    console.warn(`[instagram] reply failed for comment ${comment.id}: ${err instanceof Error ? err.message : err}`);
    const transient = err instanceof MetaApiError && err.isTransient && !timedOut && !needsReconnect;
    return { ok: false, error, needsReconnect, transient };
  }

  // Posted on Instagram; record it. Drafts are no longer useful once the comment is answered.
  const sentAt = new Date();
  const [, reply] = await db.$transaction([
    db.commentReply.deleteMany({ where: { commentId: comment.id, status: "DRAFT" } }),
    db.commentReply.create({
      data: { commentId: comment.id, text, source: opts.source, status: "SENT", remoteReplyId: remoteId, sentAt },
      select: { id: true },
    }),
    db.instagramComment.update({ where: { id: comment.id }, data: { status: "REPLIED", replyLockedAt: null } }),
  ]);
  return { ok: true, reply: { id: reply.id, text, sentAt } };
}
