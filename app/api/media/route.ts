import { NextResponse } from "next/server";
import { MediaError, saveUpload, toMediaDTO } from "@/lib/media";
import { getCurrentUser } from "@/lib/session";

/**
 * Upload one file as the raw request body (streamed to disk, never fully buffered).
 *   POST /api/media?name=<original file name>
 *   Content-Type: image/jpeg | image/png | image/webp | video/mp4 | video/quicktime
 * Responds with MediaDTO.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!request.body) return NextResponse.json({ error: "No file received" }, { status: 400 });

  try {
    const asset = await saveUpload({
      userId: user.id,
      plan: user.plan,
      contentType: request.headers.get("content-type") ?? "",
      body: request.body,
      originalName: new URL(request.url).searchParams.get("name") ?? undefined,
    });
    return NextResponse.json(toMediaDTO(asset), { status: 201 });
  } catch (err) {
    if (err instanceof MediaError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[media] upload failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
