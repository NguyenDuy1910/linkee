import "server-only";
import { setTimeout as sleep } from "node:timers/promises";
import { env } from "@/lib/env";
import { MetaApiError, metaRequest } from "@/lib/social/meta";
import type { PublishMedia } from "@/lib/social/facebook";

/**
 * Instagram content publishing (Instagram API with Instagram Login, graph.instagram.com).
 * Flow: create media container(s) → wait for FINISHED → media_publish → permalink.
 */

export type ContainerStatus = "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";

function graph(path: string): string {
  return `https://graph.instagram.com/${env().META_GRAPH_VERSION}${path}`;
}

/** Params for a single-item post: a feed photo, or a video published as a Reel. */
export function singleContainerParams(caption: string, item: PublishMedia): Record<string, string> {
  const base: Record<string, string> = caption ? { caption } : {};
  return item.kind === "IMAGE"
    ? { ...base, image_url: item.url }
    : { ...base, media_type: "REELS", video_url: item.url, share_to_feed: "true" };
}

export function carouselChildParams(item: PublishMedia): Record<string, string> {
  return item.kind === "IMAGE"
    ? { image_url: item.url, is_carousel_item: "true" }
    : { media_type: "VIDEO", video_url: item.url, is_carousel_item: "true" };
}

export function carouselParentParams(caption: string, childIds: readonly string[]): Record<string, string> {
  return { media_type: "CAROUSEL", children: childIds.join(","), ...(caption ? { caption } : {}) };
}

interface IgRequest {
  igUserId: string;
  token: string;
}

async function createContainer({ igUserId, token }: IgRequest, params: Record<string, string>): Promise<string> {
  const res = await metaRequest<{ id?: string }>(graph(`/${igUserId}/media`), {
    method: "POST",
    params,
    accessToken: token,
    timeoutMs: 60_000,
  });
  if (!res.id) throw new MetaApiError("Instagram did not return a media container id.", 502);
  return res.id;
}

/** Carousel video children must finish processing before the carousel container is created. */
const CHILD_POLL_INTERVAL_MS = 5_000;
const CHILD_POLL_LIMIT_MS = 2 * 60_000;

/**
 * Creates the container to publish and returns its id. For carousels, child containers are
 * created first (and video children awaited); they are never published on their own, so
 * re-creating them after a failure cannot produce a duplicate post.
 */
export async function createInstagramContainers(opts: {
  igUserId: string;
  token: string;
  caption: string;
  media: readonly PublishMedia[];
}): Promise<string> {
  const { caption, media } = opts;
  if (media.length === 0) throw new MetaApiError("Instagram needs at least one photo or video.", 400);
  if (media.length === 1) return createContainer(opts, singleContainerParams(caption, media[0]));

  const childIds: string[] = [];
  for (const item of media) childIds.push(await createContainer(opts, carouselChildParams(item)));

  const videoChildren = childIds.filter((_, i) => media[i].kind === "VIDEO");
  const deadline = Date.now() + CHILD_POLL_LIMIT_MS;
  for (const id of videoChildren) {
    for (;;) {
      const { statusCode, status } = await getContainerStatus(id, opts.token);
      if (statusCode === "FINISHED") break;
      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        throw new MetaApiError(`Instagram couldn't process a video in this carousel${status ? `: ${status}` : "."}`, 400);
      }
      if (Date.now() > deadline) {
        // Transient (code 2): the job retries later with fresh child containers.
        throw new MetaApiError("Instagram is still processing a video in this carousel.", 503, 2);
      }
      await sleep(CHILD_POLL_INTERVAL_MS);
    }
  }
  return createContainer(opts, carouselParentParams(caption, childIds));
}

export async function getContainerStatus(
  containerId: string,
  token: string,
): Promise<{ statusCode: ContainerStatus; status: string | null }> {
  const res = await metaRequest<{ status_code?: ContainerStatus; status?: string }>(graph(`/${containerId}`), {
    params: { fields: "status_code,status" },
    accessToken: token,
  });
  return { statusCode: res.status_code ?? "IN_PROGRESS", status: res.status ?? null };
}

export async function publishContainer(igUserId: string, containerId: string, token: string): Promise<string> {
  const res = await metaRequest<{ id?: string }>(graph(`/${igUserId}/media_publish`), {
    method: "POST",
    params: { creation_id: containerId },
    accessToken: token,
    timeoutMs: 60_000,
  });
  if (!res.id) throw new MetaApiError("Instagram did not return the published media id.", 502);
  return res.id;
}

export async function getPermalink(mediaId: string, token: string): Promise<string | null> {
  const res = await metaRequest<{ permalink?: string }>(graph(`/${mediaId}`), {
    params: { fields: "permalink" },
    accessToken: token,
  });
  return res.permalink ?? null;
}

/** Remaining API-published posts in the rolling 24h window (Instagram allows 100). */
export async function getPublishingQuota(igUserId: string, token: string): Promise<{ used: number; total: number }> {
  const res = await metaRequest<{ data?: { quota_usage?: number; config?: { quota_total?: number } }[] }>(
    graph(`/${igUserId}/content_publishing_limit`),
    { params: { fields: "quota_usage,config" }, accessToken: token },
  );
  const row = res.data?.[0];
  return { used: row?.quota_usage ?? 0, total: row?.config?.quota_total ?? 100 };
}
