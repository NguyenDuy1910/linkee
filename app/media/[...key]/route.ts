import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { db } from "@/lib/db";
import { filePathFor, STORAGE_KEY_PATTERN } from "@/lib/media";

/**
 * Public media by unguessable key. Meta's servers fetch publishing media from here,
 * so it must be reachable over public HTTPS (APP_URL). Supports byte ranges for video.
 */
export async function GET(request: Request, ctx: RouteContext<"/media/[...key]">) {
  const key = (await ctx.params).key.join("/");
  if (!STORAGE_KEY_PATTERN.test(key)) return new Response("Not found", { status: 404 });

  const asset = await db.mediaAsset.findUnique({ where: { storageKey: key }, select: { mimeType: true } });
  if (!asset) return new Response("Not found", { status: 404 });

  const filePath = filePathFor(key);
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": asset.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, { status: 200, headers });
}

export { GET as HEAD };
