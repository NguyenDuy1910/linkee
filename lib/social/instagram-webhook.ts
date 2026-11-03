import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Pure helpers for Instagram (Instagram Login) webhooks: signature verification and a
 * tolerant parser that normalizes comment notifications. No DB or network access.
 */

/**
 * Verifies `X-Hub-Signature-256: sha256=<hex>` against every configured app secret
 * (constant-time). Returns true when any secret produces a matching HMAC of the raw body.
 */
export function verifyMetaSignature(
  rawBody: string | Buffer,
  header: string | null | undefined,
  secrets: ReadonlyArray<string | null | undefined>,
): boolean {
  if (!header) return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!match) return false;
  const given = Buffer.from(match[1].toLowerCase(), "hex");
  let valid = false;
  for (const secret of secrets) {
    if (!secret) continue;
    const expected = createHmac("sha256", secret).update(rawBody).digest();
    // Check every secret so timing does not reveal which one matched.
    if (timingSafeEqual(expected, given)) valid = true;
  }
  return valid;
}

export type CommentField = "comments" | "live_comments";

export interface InstagramCommentEvent {
  /** Instagram professional account that received the comment (`entry.id`). */
  igAccountId: string;
  field: CommentField;
  commentId: string;
  text: string;
  fromId: string | null;
  fromUsername: string | null;
  mediaId: string;
  mediaProductType: string | null;
  parentId: string | null;
  /** When Meta generated the notification (`entry.time`), or receipt time if absent. */
  occurredAt: Date;
}

/** Graph IDs are strings, but tolerate numeric IDs from hand-made test payloads. */
const id = z.union([z.string().trim().min(1), z.number().int().nonnegative().transform(String)]);

const commentValue = z
  .object({
    id: id.optional(),
    comment_id: id.optional(),
    text: z.string(),
    parent_id: id.optional(),
    media_id: id.optional(),
    from: z.object({ id: id.optional(), username: z.string().optional() }).optional(),
    media: z.object({ id: id.optional(), media_product_type: z.string().optional() }).optional(),
  })
  .transform((v, ctx) => {
    const commentId = v.id ?? v.comment_id;
    const mediaId = v.media?.id ?? v.media_id;
    if (!commentId || !mediaId) {
      ctx.addIssue({ code: "custom", message: "comment id and media id are required" });
      return z.NEVER;
    }
    return { ...v, commentId, mediaId };
  });

const change = z.object({ field: z.string(), value: z.unknown() });

const entrySchema = z.object({
  id,
  /** Unix seconds (tolerate milliseconds). */
  time: z.number().positive().optional(),
  changes: z.array(z.unknown()).optional(),
  field: z.string().optional(),
  value: z.unknown().optional(),
});

const payloadSchema = z.object({
  object: z.string().optional(),
  entry: z.array(z.unknown()).default([]),
});

/** Normalizes a webhook payload into comment events; ignores other objects/fields and malformed items. */
export function parseInstagramWebhook(json: unknown, now: Date = new Date()): InstagramCommentEvent[] {
  const payload = payloadSchema.safeParse(json);
  if (!payload.success) return [];
  if (payload.data.object !== undefined && payload.data.object !== "instagram") return [];

  const events: InstagramCommentEvent[] = [];
  for (const rawEntry of payload.data.entry) {
    const entry = entrySchema.safeParse(rawEntry);
    if (!entry.success) continue;
    const { id: igAccountId, time } = entry.data;
    const occurredAt = time ? new Date(time > 1e12 ? time : time * 1000) : now;

    // Standard shape: entry.changes[]; some docs samples put field/value on the entry itself.
    const changes = entry.data.changes ?? (entry.data.field ? [{ field: entry.data.field, value: entry.data.value }] : []);
    for (const rawChange of changes) {
      const parsedChange = change.safeParse(rawChange);
      if (!parsedChange.success) continue;
      const { field } = parsedChange.data;
      if (field !== "comments" && field !== "live_comments") continue;
      const value = commentValue.safeParse(parsedChange.data.value);
      if (!value.success) continue;
      const v = value.data;
      events.push({
        igAccountId,
        field,
        commentId: v.commentId,
        text: v.text,
        fromId: v.from?.id ?? null,
        fromUsername: v.from?.username ?? null,
        mediaId: v.mediaId,
        mediaProductType: v.media?.media_product_type ?? null,
        parentId: v.parent_id ?? null,
        occurredAt,
      });
    }
  }
  return events;
}
