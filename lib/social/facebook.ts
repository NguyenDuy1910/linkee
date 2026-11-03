import "server-only";
import { env } from "@/lib/env";
import { MetaApiError, metaRequest } from "@/lib/social/meta";

/**
 * Facebook Login for Pages (graph.facebook.com) and Page publishing with Page tokens.
 * Never mixed with Instagram Login: each Facebook Page is its own SocialAccount.
 */

export const FACEBOOK_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "publish_video"] as const;
/** Without these Linkee can't list Pages or create posts at all. */
export const REQUIRED_FACEBOOK_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"] as const;
/** Page tasks that allow creating posts. */
const PUBLISH_TASKS = ["CREATE_CONTENT", "MANAGE"];

function graph(path: string): string {
  return `https://graph.facebook.com/${env().META_GRAPH_VERSION}${path}`;
}

export function facebookRedirectUri(): string {
  return `${env().APP_URL}/api/social/facebook/callback`;
}

export function facebookAuthorizeUrl(state: string): string {
  const e = env();
  const url = new URL(`https://www.facebook.com/${e.META_GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", e.META_APP_ID ?? "");
  url.searchParams.set("redirect_uri", facebookRedirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", FACEBOOK_SCOPES.join(","));
  return url.toString();
}

/** Exchanges the OAuth code for a long-lived user token (Page tokens derived from it don't expire). */
export async function exchangeFacebookCode(code: string): Promise<string> {
  const e = env();
  const short = await metaRequest<{ access_token: string }>(graph("/oauth/access_token"), {
    params: {
      client_id: e.META_APP_ID,
      client_secret: e.META_APP_SECRET,
      redirect_uri: facebookRedirectUri(),
      code,
    },
    retries: 0,
  });
  const long = await metaRequest<{ access_token: string }>(graph("/oauth/access_token"), {
    params: {
      grant_type: "fb_exchange_token",
      client_id: e.META_APP_ID,
      client_secret: e.META_APP_SECRET,
      fb_exchange_token: short.access_token,
    },
  });
  return long.access_token;
}

export async function getGrantedPermissions(userToken: string): Promise<string[]> {
  const res = await metaRequest<{ data?: { permission: string; status: string }[] }>(graph("/me/permissions"), {
    accessToken: userToken,
  });
  return (res.data ?? []).filter((p) => p.status === "granted").map((p) => p.permission);
}

export interface FacebookPage {
  id: string;
  name: string;
  accessToken: string;
  tasks: string[];
  pictureUrl: string | null;
}

interface RawPage {
  id: string;
  name?: string;
  access_token?: string;
  tasks?: string[];
  picture?: { data?: { url?: string } };
}

/** Raw `/me/accounts` page objects → Pages the user can publish to. */
export function parsePublishablePages(data: readonly RawPage[]): FacebookPage[] {
  return data
    .filter((p) => p.access_token && (p.tasks ?? []).some((t) => PUBLISH_TASKS.includes(t)))
    .map((p) => ({
      id: p.id,
      name: p.name || `Page ${p.id}`,
      accessToken: p.access_token as string,
      tasks: p.tasks ?? [],
      pictureUrl: p.picture?.data?.url ?? null,
    }));
}

/** Every Page the user shared in the dialog that they can create content on. */
export async function listPages(userToken: string): Promise<FacebookPage[]> {
  const pages: RawPage[] = [];
  let next: string | undefined = graph("/me/accounts");
  let params: Record<string, string> | undefined = { fields: "id,name,access_token,tasks,picture{url}", limit: "100" };
  // Bounded pagination; nobody shares more than a few hundred Pages.
  for (let i = 0; next && i < 5; i++) {
    const res: { data?: RawPage[]; paging?: { next?: string } } = await metaRequest(next, { params, accessToken: userToken });
    pages.push(...(res.data ?? []));
    next = res.paging?.next;
    params = undefined; // `next` already carries the query
  }
  return parsePublishablePages(pages);
}

export interface PublishMedia {
  kind: "IMAGE" | "VIDEO";
  /** Absolute public HTTPS URL Meta downloads. */
  url: string;
}

/** POST /{page-id}/feed form params for a multi-photo post built from unpublished photo ids. */
export function buildFeedParams(message: string, mediaFbids: readonly string[]): Record<string, string> {
  const params: Record<string, string> = {};
  if (message) params.message = message;
  mediaFbids.forEach((id, i) => {
    params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
  });
  return params;
}

export function facebookPostUrl(postId: string): string {
  return `https://www.facebook.com/${postId}`;
}

/** Publishes immediately to a Page. Throws MetaApiError with Meta's message on failure. */
export async function publishToPage(opts: {
  pageId: string;
  token: string;
  caption: string;
  media: readonly PublishMedia[];
}): Promise<{ remotePostId: string; remoteUrl: string }> {
  const { pageId, token, caption, media } = opts;
  // Uploads can take a while for Meta to fetch; POSTs are never auto-retried (no duplicate posts).
  const post = <T>(path: string, params: Record<string, string>) =>
    metaRequest<T>(graph(path), { method: "POST", params, accessToken: token, timeoutMs: 120_000 });

  const videos = media.filter((m) => m.kind === "VIDEO");
  const images = media.filter((m) => m.kind === "IMAGE");

  if (videos.length > 0) {
    if (videos.length > 1 || images.length > 0) throw new MetaApiError("Facebook posts support a single video.", 400);
    const res = await post<{ id: string }>(`/${pageId}/videos`, {
      file_url: videos[0].url,
      ...(caption ? { description: caption } : {}),
    });
    return { remotePostId: res.id, remoteUrl: `https://www.facebook.com/${pageId}/videos/${res.id}` };
  }

  if (images.length === 1) {
    const res = await post<{ id: string; post_id?: string }>(`/${pageId}/photos`, {
      url: images[0].url,
      ...(caption ? { message: caption } : {}),
    });
    const id = res.post_id ?? res.id;
    return { remotePostId: id, remoteUrl: facebookPostUrl(id) };
  }

  const fbids: string[] = [];
  for (const image of images) {
    const res = await post<{ id: string }>(`/${pageId}/photos`, { url: image.url, published: "false" });
    fbids.push(res.id);
  }
  const res = await post<{ id: string }>(`/${pageId}/feed`, buildFeedParams(caption, fbids));
  return { remotePostId: res.id, remoteUrl: facebookPostUrl(res.id) };
}
