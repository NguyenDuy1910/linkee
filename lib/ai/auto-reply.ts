import "server-only";
import { z } from "zod";
import { OpenRouterError } from "@/lib/ai/openrouter";
import { assertAiAllowed, generateReply, getAiSettings, QuotaError, type AiUser, type GeneratedReply } from "@/lib/ai/replies";
import { db } from "@/lib/db";
import { isOwnComment, sendReply } from "@/lib/instagram-comments";
import { isOpenRouterConfigured } from "@/lib/env";
import type { ConnectionStatus } from "@/lib/generated/prisma/client";
import { PermanentJobError, type JobHandler } from "@/lib/jobs";
import { entitlements } from "@/lib/plans";

/** Auto-replies only answer fresh comments. */
export const AUTO_REPLY_MAX_AGE_MS = 24 * 60 * 60_000;

/**
 * Unmet prerequisites for turning auto-reply on (empty = allowed). Shared by Settings UI and
 * the toggle action so both show the same reasons.
 */
export function autoReplyBlockers(
  account: { status: ConnectionStatus; webhooksSubscribed: boolean },
  user: { entitlements: { ai: boolean } },
  workerHealthy: boolean,
): string[] {
  const reasons: string[] = [];
  if (!user.entitlements.ai) reasons.push("Auto-replies are part of Linkee Pro.");
  if (!isOpenRouterConfigured()) reasons.push("AI isn't configured on this server (OPENROUTER_API_KEY).");
  if (account.status !== "ACTIVE") reasons.push("Reconnect this account first.");
  if (!account.webhooksSubscribed) {
    reasons.push("Real-time comment updates aren't active for this account. They need a Live Meta app with Advanced Access for comments; reconnect once that's approved.");
  }
  if (!workerHealthy) reasons.push("The background worker isn't running, so replies couldn't be sent.");
  return reasons;
}

// ───────────────────────────── Pure filters ─────────────────────────────

const URL_PATTERN = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|io|co|ly|me|link|info|xyz|shop|site|top|ru|biz|click|online|store)\b/i;

/** Reason a comment looks like spam, or null. Cheap heuristics only; no AI involved. */
export function spamReason(text: string): string | null {
  if (URL_PATTERN.test(text)) return "contains a link";
  if ((text.match(/@[\w.]+/g) ?? []).length >= 3) return "mentions 3 or more accounts";
  if (/(.)\1{7,}/u.test(text)) return "repeats a character 8+ times";
  return null;
}

export function letterCount(text: string): number {
  return (text.match(/\p{L}/gu) ?? []).length;
}

/** First skip keyword contained in the text (case-insensitive), or null. */
export function matchedSkipKeyword(text: string, keywords: readonly string[]): string | null {
  const haystack = text.toLocaleLowerCase();
  return keywords.find((k) => k.trim() && haystack.includes(k.trim().toLocaleLowerCase())) ?? null;
}

// ───────────────────────────── Job handler ─────────────────────────────

const payloadSchema = z.object({ commentId: z.string().min(1) });

function skip(commentId: string, reason: string): void {
  console.info(`[auto-reply] ${commentId}: skipped (${reason})`);
}

/** Job "instagram.autoReply": cheap filters first, then one AI call and a duplicate-safe send. */
export const handleAutoReply: JobHandler = async (payload) => {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) throw new PermanentJobError("Invalid auto-reply payload");
  const { commentId } = parsed.data;

  const comment = await db.instagramComment.findUnique({
    where: { id: commentId },
    include: {
      socialAccount: { include: { user: { select: { id: true, plan: true } } } },
      replies: { where: { status: "SENT" }, select: { id: true }, take: 1 },
    },
  });
  if (!comment) return skip(commentId, "comment not found");
  const account = comment.socialAccount;
  if (account.status !== "ACTIVE") return skip(commentId, "account needs reconnect");
  if (!account.autoReplyEnabled) return skip(commentId, "auto-reply off");
  const user: AiUser = { id: account.user.id, entitlements: entitlements(account.user.plan) };
  if (!user.entitlements.ai) return skip(commentId, "plan without AI");
  if (comment.status !== "NEW" || comment.replies.length > 0) return skip(commentId, "already handled");
  if (comment.parentIgCommentId) return skip(commentId, "thread reply");
  if (isOwnComment(account, { igId: comment.authorIgId, username: comment.authorUsername })) return skip(commentId, "own comment");
  if (Date.now() - comment.commentedAt.getTime() > AUTO_REPLY_MAX_AGE_MS) return skip(commentId, "older than 24h");
  if (letterCount(comment.text) < 2) return skip(commentId, "too short");
  const spam = spamReason(comment.text);
  if (spam) return skip(commentId, `spam: ${spam}`);
  const settings = await getAiSettings(user.id);
  if (matchedSkipKeyword(comment.text, settings.skipKeywords)) return skip(commentId, "skip keyword");

  try {
    await assertAiAllowed(user, "AUTO_REPLY");
  } catch (err) {
    if (err instanceof QuotaError) {
      if (err.kind === "rate_limit") return { rescheduleInMs: 60_000 };
      return skip(commentId, err.kind);
    }
    throw err;
  }

  let generated: GeneratedReply;
  try {
    generated = await generateReply({ user, comment, purpose: "AUTO_REPLY" });
  } catch (err) {
    if (err instanceof QuotaError) {
      if (err.kind === "rate_limit") return { rescheduleInMs: 60_000 };
      return skip(commentId, err.kind);
    }
    if (err instanceof OpenRouterError && err.isTransient) throw err;
    throw new PermanentJobError(err instanceof Error ? err.message : String(err));
  }

  if (generated.skip) {
    await db.instagramComment.updateMany({ where: { id: commentId, status: "NEW" }, data: { status: "SKIPPED" } });
    return skip(commentId, "AI chose not to reply");
  }

  const sent = await sendReply({ userId: user.id, commentId, text: generated.text, source: "AUTO" });
  if (sent.ok) {
    console.info(`[auto-reply] ${commentId}: replied`);
    return;
  }
  if (sent.transient) throw new Error(sent.error);
  throw new PermanentJobError(sent.error);
};
