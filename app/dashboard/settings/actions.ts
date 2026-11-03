"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { autoReplyBlockers } from "@/lib/ai/auto-reply";
import { aiPreferencesSchema, type AiPreferencesInput } from "@/lib/ai/preferences";
import { db } from "@/lib/db";
import { isWorkerHealthy } from "@/lib/jobs";
import { requireUser } from "@/lib/session";

const idSchema = z.string().min(1).max(64);

/** Removes a connected account (Instagram or Facebook Page) and its stored token. */
export async function disconnectAccountAction(accountId: string): Promise<ActionResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(accountId);
  if (!id.success) return fail("Invalid account.");
  const { count } = await db.socialAccount.deleteMany({ where: { id: id.data, userId: user.id } });
  if (count === 0) return fail("This account was already disconnected.");
  refresh();
  return ok();
}

export async function setAutoReplyAction(accountId: string, enabled: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ accountId: idSchema, enabled: z.boolean() }).safeParse({ accountId, enabled });
  if (!parsed.success) return fail("Invalid request.");
  const account = await db.socialAccount.findFirst({
    where: { id: parsed.data.accountId, userId: user.id, provider: "INSTAGRAM" },
    select: { id: true, status: true, webhooksSubscribed: true },
  });
  if (!account) return fail("This Instagram account is no longer connected.");

  if (parsed.data.enabled) {
    const blockers = autoReplyBlockers(account, user, await isWorkerHealthy());
    if (blockers.length > 0) return fail(`Auto-reply can't be turned on yet: ${blockers.join(" ")}`);
  }
  await db.socialAccount.update({ where: { id: account.id }, data: { autoReplyEnabled: parsed.data.enabled } });
  refresh();
  return ok();
}

export async function saveAiPreferencesAction(input: AiPreferencesInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = aiPreferencesSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  const { tone, language, brandContext, skipKeywords } = parsed.data;
  await db.aiSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tone, language, brandContext, skipKeywords },
    update: { tone, language, brandContext, skipKeywords },
  });
  refresh();
  return ok();
}
