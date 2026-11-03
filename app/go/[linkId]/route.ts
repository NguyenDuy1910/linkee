import { NextResponse } from "next/server";
import { isSafeLinkUrl } from "@/lib/bio";
import { db } from "@/lib/db";

const NO_STORE = { "Cache-Control": "no-store" };

/** Counts a click on an active link of a published page, then 302s to its stored URL. */
export async function GET(_request: Request, { params }: RouteContext<"/go/[linkId]">) {
  const { linkId } = await params;
  if (!linkId || linkId.length > 64) return notFound();

  // Single conditional UPDATE: atomic increment, only for active links on published pages.
  const updated = await db.bioLink.updateManyAndReturn({
    where: { id: linkId, isActive: true, page: { published: true } },
    data: { clicks: { increment: 1 } },
    select: { url: true },
  });
  const url = updated[0]?.url;
  if (!url || !isSafeLinkUrl(url)) return notFound();

  return new NextResponse(null, { status: 302, headers: { Location: url, ...NO_STORE } });
}

function notFound() {
  return new NextResponse("Link not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", ...NO_STORE } });
}
