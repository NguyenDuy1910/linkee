import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { MetaApiError, metaRequest } from "@/lib/social/meta";

/**
 * Instagram API with Instagram Login (graph.instagram.com, Instagram user tokens).
 * Professional (Business / Creator) accounts only. Tokens are never logged.
 */

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
] as const;

export const COMMENTS_SCOPE = "instagram_business_manage_comments";

export const PROFESSIONAL_ACCOUNT_HELP_URL = "https://help.instagram.com/502981923235522";

function graph(path: string): string {
  return `https://graph.instagram.com/${env().META_GRAPH_VERSION}${path}`;
}

export function instagramRedirectUri(): string {
  return `${env().APP_URL}/api/social/instagram/callback`;
}

export function instagramAuthorizeUrl(state: string): string {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", env().INSTAGRAM_APP_ID ?? "");
  url.searchParams.set("redirect_uri", instagramRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", INSTAGRAM_SCOPES.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

const permissions = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((p) =>
    (Array.isArray(p) ? p : (p ?? "").split(","))
      .map((s) => s.trim())
      .filter(Boolean),
  );

const shortTokenSchema = z.object({ access_token: z.string().min(1), permissions });
const shortTokenResponse = z.union([
  z.object({ data: z.array(shortTokenSchema).min(1) }).transform((r) => r.data[0]),
  shortTokenSchema,
]);

/** Exchanges the OAuth `code` for a short-lived (1 hour) Instagram user token. */
export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; permissions: string[] }> {
  const e = env();
  const res = await metaRequest<unknown>("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    params: {
      client_id: e.INSTAGRAM_APP_ID,
      client_secret: e.INSTAGRAM_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: instagramRedirectUri(),
      code: code.replace(/#_$/, ""),
    },
  });
  const parsed = shortTokenResponse.safeParse(res);
  if (!parsed.success) throw new MetaApiError("Instagram returned an unexpected token response", 502);
  return { accessToken: parsed.data.access_token, permissions: parsed.data.permissions };
}

/** Short-lived → long-lived (60 days) token. */
export async function exchangeForLongLivedToken(shortToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await metaRequest<{ access_token?: string; expires_in?: number }>("https://graph.instagram.com/access_token", {
    params: { grant_type: "ig_exchange_token", client_secret: env().INSTAGRAM_APP_SECRET, access_token: shortToken },
  });
  if (!res.access_token) throw new MetaApiError("Instagram did not return a long-lived token", 502);
  const expiresIn = typeof res.expires_in === "number" && res.expires_in > 0 ? res.expires_in : 60 * 86_400;
  return { accessToken: res.access_token, expiresAt: new Date(Date.now() + expiresIn * 1000) };
}

export interface InstagramProfile {
  /** Instagram professional account ID; equals webhook `entry.id`. */
  userId: string;
  username: string;
  name: string | null;
  /** BUSINESS | MEDIA_CREATOR */
  accountType: string | null;
  profilePictureUrl: string | null;
}

const idField = z.union([z.string().min(1), z.number().transform(String)]);

const profileSchema = z.object({
  user_id: idField.optional(),
  id: idField.optional(),
  username: z.string(),
  name: z.string().optional(),
  account_type: z.string().optional(),
  profile_picture_url: z.string().optional(),
});

export async function fetchInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const res = await metaRequest<unknown>(graph("/me"), {
    accessToken,
    params: { fields: "user_id,username,name,account_type,profile_picture_url" },
  });
  const parsed = profileSchema.safeParse(res);
  const userId = parsed.success ? (parsed.data.user_id ?? parsed.data.id) : undefined;
  if (!parsed.success || !userId) throw new MetaApiError("Instagram returned an unexpected profile response", 502);
  return {
    userId,
    username: parsed.data.username,
    name: parsed.data.name?.trim() || null,
    accountType: parsed.data.account_type ? parsed.data.account_type.toUpperCase() : null,
    profilePictureUrl: parsed.data.profile_picture_url ?? null,
  };
}

export interface InstagramMedia {
  id: string;
  caption: string | null;
  mediaType: string | null;
  /** Image for photos/carousels, cover frame for videos. */
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
}

const mediaListSchema = z.object({
  data: z.array(
    z.object({
      id: idField,
      caption: z.string().optional(),
      media_type: z.string().optional(),
      media_url: z.string().optional(),
      thumbnail_url: z.string().optional(),
      permalink: z.string().optional(),
      timestamp: z.string().optional(),
    }),
  ),
});

export async function listRecentMedia(igUserId: string, accessToken: string, limit = 10): Promise<InstagramMedia[]> {
  const res = await metaRequest<unknown>(graph(`/${encodeURIComponent(igUserId)}/media`), {
    accessToken,
    params: { fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp", limit },
  });
  const parsed = mediaListSchema.safeParse(res);
  if (!parsed.success) throw new MetaApiError("Instagram returned an unexpected media response", 502);
  return parsed.data.data.map((m) => ({
    id: m.id,
    caption: m.caption ?? null,
    mediaType: m.media_type ?? null,
    thumbnailUrl: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url ?? m.thumbnail_url) ?? null,
    permalink: m.permalink ?? null,
    timestamp: m.timestamp ?? null,
  }));
}

export interface InstagramApiComment {
  id: string;
  text: string;
  timestamp: string | null;
  username: string | null;
  fromId: string | null;
  parentId: string | null;
}

const commentListSchema = z.object({
  data: z.array(
    z.object({
      id: idField,
      text: z.string().default(""),
      timestamp: z.string().optional(),
      username: z.string().optional(),
      from: z.object({ id: idField.optional(), username: z.string().optional() }).optional(),
      parent_id: idField.optional(),
    }),
  ),
});

export async function listMediaComments(mediaId: string, accessToken: string, limit = 50): Promise<InstagramApiComment[]> {
  const res = await metaRequest<unknown>(graph(`/${encodeURIComponent(mediaId)}/comments`), {
    accessToken,
    params: { fields: "id,text,timestamp,username,from,parent_id", limit },
  });
  const parsed = commentListSchema.safeParse(res);
  if (!parsed.success) throw new MetaApiError("Instagram returned an unexpected comments response", 502);
  return parsed.data.data.map((c) => ({
    id: c.id,
    text: c.text,
    timestamp: c.timestamp ?? null,
    username: c.username ?? c.from?.username ?? null,
    fromId: c.from?.id ?? null,
    parentId: c.parent_id ?? null,
  }));
}

/** Publishes a public reply. POST without retries: a retried POST could post twice. */
export async function replyToComment(commentId: string, message: string, accessToken: string): Promise<{ id: string }> {
  const res = await metaRequest<{ id?: string | number }>(graph(`/${encodeURIComponent(commentId)}/replies`), {
    method: "POST",
    accessToken,
    params: { message },
    retries: 0,
  });
  if (res.id === undefined || res.id === "") throw new MetaApiError("Instagram did not confirm the reply", 502);
  return { id: String(res.id) };
}

/**
 * Subscribes the app to comment webhooks for this account. Requires a Live app with Advanced
 * Access for comments; failure is expected in development and reported as `false`.
 */
export async function subscribeToCommentWebhooks(accessToken: string): Promise<{ subscribed: boolean; error?: string }> {
  try {
    const url = new URL(graph("/me/subscribed_apps"));
    url.searchParams.set("subscribed_fields", "comments");
    const res = await metaRequest<{ success?: boolean }>(url.toString(), { method: "POST", accessToken });
    return { subscribed: res.success === true };
  } catch (err) {
    return { subscribed: false, error: err instanceof Error ? err.message : String(err) };
  }
}
