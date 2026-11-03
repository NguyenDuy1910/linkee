import "server-only";
import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { MediaAsset, MediaKind, Plan } from "@/lib/generated/prisma/client";

/**
 * Uploaded media lives on a local disk volume (MEDIA_DIR) with metadata in Postgres.
 * Single-host only: back the volume up and do not run multiple app hosts without
 * shared storage. Files are publicly reachable by unguessable key at /media/<key>
 * because Meta fetches publishing media from a public HTTPS URL.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime"] as const;
/** Instagram rejects images over 8 MB. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_EDGE = 2160;
const STORAGE_QUOTA: Record<Plan, number> = { FREE: 50 * 1024 * 1024, PRO: 2 * 1024 * 1024 * 1024 };

export const STORAGE_KEY_PATTERN = /^[a-f0-9]{2}\/[a-f0-9]{32}\.(jpg|mp4|mov)$/;

export class MediaError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export interface MediaDTO {
  id: string;
  kind: MediaKind;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

export function mediaRoot(): string {
  return path.resolve(env().MEDIA_DIR);
}

/** Absolute public URL (what Meta downloads). */
export function publicMediaUrl(storageKey: string): string {
  return `${env().APP_URL}/media/${storageKey}`;
}

export function toMediaDTO(asset: MediaAsset): MediaDTO {
  return {
    id: asset.id,
    kind: asset.kind,
    url: `/media/${asset.storageKey}`,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
  };
}

export function filePathFor(storageKey: string): string {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) throw new MediaError("Invalid media key", 404);
  return path.join(mediaRoot(), storageKey);
}

/**
 * Streams the request body to disk with a hard byte cap (no full buffering), validates
 * the real file signature, normalizes images to EXIF-stripped JPEG (Instagram only accepts
 * JPEG), and records a MediaAsset.
 */
export async function saveUpload(opts: {
  userId: string;
  plan: Plan;
  contentType: string;
  body: ReadableStream<Uint8Array>;
  originalName?: string;
}): Promise<MediaAsset> {
  const type = opts.contentType.split(";")[0].trim().toLowerCase();
  const isImage = (IMAGE_TYPES as readonly string[]).includes(type);
  const isVideo = (VIDEO_TYPES as readonly string[]).includes(type);
  if (!isImage && !isVideo) {
    throw new MediaError("Unsupported file type. Use JPEG, PNG, WebP, MP4 or MOV.", 415);
  }
  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  const used = await db.mediaAsset.aggregate({ where: { userId: opts.userId }, _sum: { sizeBytes: true } });
  if ((used._sum.sizeBytes ?? 0) >= STORAGE_QUOTA[opts.plan]) {
    throw new MediaError("Storage limit reached. Delete unused drafts or upgrade your plan.", 413);
  }

  const id = randomBytes(16).toString("hex");
  const ext = isImage ? "jpg" : type === "video/quicktime" ? "mov" : "mp4";
  const storageKey = `${id.slice(0, 2)}/${id}.${ext}`;
  const finalPath = path.join(mediaRoot(), storageKey);
  const tmpPath = `${finalPath}.upload`;
  await mkdir(path.dirname(finalPath), { recursive: true });

  let received = 0;
  let head = Buffer.alloc(0);
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      received += chunk.length;
      if (received > maxBytes) {
        cb(new MediaError(`File is too large. Maximum is ${Math.round(maxBytes / 1024 / 1024)} MB.`, 413));
        return;
      }
      if (head.length < 16) head = Buffer.concat([head, chunk]).subarray(0, 16);
      cb(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(opts.body as NodeReadableStream), limiter, createWriteStream(tmpPath));
    if (received === 0) throw new MediaError("The file is empty.");
    if (!matchesSignature(type, head)) throw new MediaError("File content does not match its type.", 415);

    let width: number | null = null;
    let height: number | null = null;
    let sizeBytes = received;
    if (isImage) {
      const out = await sharp(tmpPath, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(finalPath);
      width = out.width;
      height = out.height;
      sizeBytes = out.size;
      await rm(tmpPath, { force: true });
      if (sizeBytes > MAX_IMAGE_BYTES) throw new MediaError("Image is too large after processing. Try a smaller image.", 413);
    } else {
      await rename(tmpPath, finalPath);
    }

    return await db.mediaAsset.create({
      data: {
        userId: opts.userId,
        kind: isImage ? "IMAGE" : "VIDEO",
        mimeType: isImage ? "image/jpeg" : type,
        sizeBytes,
        width,
        height,
        storageKey,
        originalName: opts.originalName?.slice(0, 200),
      },
    });
  } catch (err) {
    await rm(tmpPath, { force: true });
    await rm(finalPath, { force: true });
    if (err instanceof MediaError) throw err;
    if (err instanceof Error && /unsupported image format|Input file/i.test(err.message)) {
      throw new MediaError("This image could not be read. Try a different file.", 415);
    }
    throw err;
  }
}

function matchesSignature(type: string, head: Buffer): boolean {
  switch (type) {
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/png":
      return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return head.subarray(0, 4).toString("latin1") === "RIFF" && head.subarray(8, 12).toString("latin1") === "WEBP";
    case "video/mp4":
    case "video/quicktime":
      return head.subarray(4, 8).toString("latin1") === "ftyp" || head.subarray(4, 8).toString("latin1") === "moov";
    default:
      return false;
  }
}

/** Deletes the file and row. Caller must have verified ownership. */
export async function deleteMediaAsset(asset: Pick<MediaAsset, "id" | "storageKey">): Promise<void> {
  await db.mediaAsset.delete({ where: { id: asset.id } });
  await rm(filePathFor(asset.storageKey), { force: true });
}

/** Job handler: removes uploads not attached to any post or bio avatar after 24 hours. */
export async function handleMediaCleanup(): Promise<void> {
  const orphans = await db.mediaAsset.findMany({
    where: {
      createdAt: { lt: new Date(Date.now() - 86_400_000) },
      postMedia: { none: {} },
      bioAvatars: { none: {} },
    },
    select: { id: true, storageKey: true },
    take: 500,
  });
  for (const asset of orphans) await deleteMediaAsset(asset);
  if (orphans.length) console.info(`[media] removed ${orphans.length} orphaned uploads`);
}

export async function fileSize(storageKey: string): Promise<number> {
  return (await stat(filePathFor(storageKey))).size;
}
