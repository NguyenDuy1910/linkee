"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import {
  deleteDraft,
  draftInputSchema,
  retryTarget,
  saveDraft,
  submitInputSchema,
  submitPost,
} from "@/lib/publishing";
import { requireUser } from "@/lib/session";

const idSchema = z.string().trim().min(1).max(64);

export async function saveDraftAction(input: unknown): Promise<ActionResult<{ postId: string }>> {
  const user = await requireUser();
  const parsed = draftInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input.");
  const result = await saveDraft(user, parsed.data);
  if (result.ok) refresh();
  return result;
}

export async function publishPostAction(
  input: unknown,
): Promise<ActionResult<{ postId: string; targetCount: number }>> {
  const user = await requireUser();
  const parsed = submitInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input.");
  const result = await submitPost(user, parsed.data);
  if (result.ok) refresh();
  return result;
}

export async function retryTargetAction(targetId: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(targetId);
  if (!parsed.success) return fail("Unknown destination.");
  const result = await retryTarget(user, parsed.data);
  if (result.ok) refresh();
  return result;
}

export async function deleteDraftAction(postId: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(postId);
  if (!parsed.success) return fail("Unknown draft.");
  const result = await deleteDraft(user, parsed.data);
  if (result.ok) refresh();
  return result;
}
