"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { OpenRouterError } from "@/lib/ai/openrouter";
import { getOrCreateSuggestion, QuotaError, SuggestionUnavailableError } from "@/lib/ai/replies";
import { db } from "@/lib/db";
import { REPLY_MAX_CHARS, sendReply, syncComments } from "@/lib/instagram-comments";
import { requireUser } from "@/lib/session";

const idSchema = z.string().min(1).max(64);

export async function refreshCommentsAction(accountId: string): Promise<ActionResult<{ message: string; newCount: number }>> {
  const user = await requireUser();
  const id = idSchema.safeParse(accountId);
  if (!id.success) return fail("Choose an account to refresh.");
  const account = await db.socialAccount.findFirst({ where: { id: id.data, userId: user.id, provider: "INSTAGRAM" } });
  if (!account) return fail("This Instagram account is no longer connected.");
  const result = await syncComments(account);
  refresh();
  return result.ok ? ok({ message: result.message, newCount: result.newCount }) : fail(result.error);
}

export type SuggestionData = { skip: true } | { skip: false; text: string };

export async function suggestReplyAction(commentId: string, regenerate: boolean): Promise<ActionResult<SuggestionData>> {
  const user = await requireUser();
  const parsed = z.object({ commentId: idSchema, regenerate: z.boolean() }).safeParse({ commentId, regenerate });
  if (!parsed.success) return fail("Invalid request.");
  try {
    const result = await getOrCreateSuggestion({ user, commentId: parsed.data.commentId, regenerate: parsed.data.regenerate });
    return ok(result.skip ? { skip: true as const } : { skip: false as const, text: result.text });
  } catch (err) {
    if (err instanceof QuotaError || err instanceof OpenRouterError || err instanceof SuggestionUnavailableError) {
      return fail(err.message);
    }
    console.error("[inbox] suggestion failed:", err instanceof Error ? err.message : err);
    return fail("Couldn't generate a suggestion right now. Please try again.");
  }
}

const sendSchema = z.object({
  commentId: idSchema,
  text: z
    .string()
    .trim()
    .min(1, "Write a reply first.")
    .max(REPLY_MAX_CHARS, `Replies can be at most ${REPLY_MAX_CHARS} characters.`),
  source: z.enum(["MANUAL", "AI"]),
});

export async function sendReplyAction(input: z.input<typeof sendSchema>): Promise<ActionResult<{ sentAt: string }>> {
  const user = await requireUser();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid reply.");
  const result = await sendReply({ userId: user.id, ...parsed.data });
  refresh();
  return result.ok ? ok({ sentAt: result.reply.sentAt.toISOString() }) : fail(result.error);
}

export async function setCommentStatusAction(commentId: string, status: "NEW" | "SKIPPED"): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ commentId: idSchema, status: z.enum(["NEW", "SKIPPED"]) }).safeParse({ commentId, status });
  if (!parsed.success) return fail("Invalid request.");
  const { count } = await db.instagramComment.updateMany({
    where: { id: parsed.data.commentId, socialAccount: { userId: user.id }, status: { not: "REPLIED" } },
    data: { status: parsed.data.status },
  });
  if (count === 0) return fail("This comment can't be changed — it may have been replied to or removed.");
  refresh();
  return ok();
}
