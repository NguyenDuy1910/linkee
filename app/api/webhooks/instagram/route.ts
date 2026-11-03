import type { NextRequest } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isOwnComment } from "@/lib/instagram-comments";
import { enqueueJob } from "@/lib/jobs";
import { entitlements } from "@/lib/plans";
import { parseInstagramWebhook, verifyMetaSignature } from "@/lib/social/instagram-webhook";

/** Meta webhook verification handshake. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const expected = env().META_WEBHOOK_VERIFY_TOKEN;
  const token = params.get("hub.verify_token") ?? "";
  const challenge = params.get("hub.challenge") ?? "";
  if (params.get("hub.mode") === "subscribe" && expected && safeEqual(token, expected) && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/**
 * Comment notifications. Signature-checked, idempotent (Meta retries for up to 36h), and fast:
 * AI work happens later in the job worker.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const e = env();
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"), [e.INSTAGRAM_APP_SECRET, e.META_APP_SECRET])) {
    return new Response("Invalid signature", { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const events = parseInstagramWebhook(json);
  if (events.length === 0) return new Response("OK", { status: 200 });

  const accounts = await db.socialAccount.findMany({
    where: { provider: "INSTAGRAM", providerAccountId: { in: [...new Set(events.map((ev) => ev.igAccountId))] } },
    select: {
      id: true,
      providerAccountId: true,
      username: true,
      status: true,
      autoReplyEnabled: true,
      user: { select: { plan: true } },
    },
  });
  const byIgId = new Map(accounts.map((a) => [a.providerAccountId, a]));

  for (const ev of events) {
    const account = byIgId.get(ev.igAccountId);
    if (!account) continue;
    if (isOwnComment(account, { igId: ev.fromId, username: ev.fromUsername })) continue;
    try {
      const comment = await db.instagramComment.upsert({
        where: { igCommentId: ev.commentId },
        create: {
          socialAccountId: account.id,
          igCommentId: ev.commentId,
          igMediaId: ev.mediaId,
          parentIgCommentId: ev.parentId,
          authorUsername: ev.fromUsername,
          authorIgId: ev.fromId,
          text: ev.text,
          commentedAt: ev.occurredAt,
          status: "NEW",
        },
        // Webhooks carry no caption/permalink; keep whatever a sync stored.
        update: { text: ev.text },
        select: { id: true, status: true },
      });
      if (
        ev.field === "comments" &&
        comment.status === "NEW" &&
        account.status === "ACTIVE" &&
        account.autoReplyEnabled &&
        entitlements(account.user.plan).ai
      ) {
        await enqueueJob("instagram.autoReply", { commentId: comment.id }, { dedupeKey: `ig-auto-reply:${ev.commentId}`, maxAttempts: 4 });
      }
    } catch (err) {
      console.error(`[webhook] failed to store comment for account ${account.id}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return new Response("OK", { status: 200 });
}
