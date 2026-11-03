"use server";

import { loadEditorData, type BioEditorData } from "@/app/dashboard/my-page/data";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { bioPageInputSchema, type BioPageInput } from "@/lib/bio";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireUser } from "@/lib/session";

const SLUG_TAKEN = "That username is taken";

export async function saveBioPage(input: BioPageInput): Promise<ActionResult<BioEditorData>> {
  const user = await requireUser();
  const parsed = bioPageInputSchema.safeParse(input);
  if (!parsed.success) return fail("Some fields need your attention.", zodFieldErrors(parsed.error));
  const data = parsed.data;

  const page = await db.bioPage.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!page) return fail("Your page could not be found. Please reload and try again.");

  const slugOwner = await db.bioPage.findUnique({ where: { slug: data.slug }, select: { id: true } });
  if (slugOwner && slugOwner.id !== page.id) return fail(SLUG_TAKEN, { slug: SLUG_TAKEN });

  if (data.avatarMediaId) {
    const avatar = await db.mediaAsset.findFirst({
      where: { id: data.avatarMediaId, userId: user.id, kind: "IMAGE" },
      select: { id: true },
    });
    if (!avatar) return fail("That profile photo is no longer available. Please upload it again.", { avatarMediaId: "Upload a new photo" });
  }

  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.bioLink.findMany({ where: { pageId: page.id }, select: { id: true } });
      const existingIds = new Set(existing.map((l) => l.id));
      const keptIds = data.links.flatMap((l) => (l.id && existingIds.has(l.id) ? [l.id] : []));

      await tx.bioLink.deleteMany({ where: { pageId: page.id, id: { notIn: keptIds } } });

      for (const [position, link] of data.links.entries()) {
        const fields = { title: link.title, url: link.url, isActive: link.isActive, position };
        if (link.id && existingIds.has(link.id)) {
          await tx.bioLink.update({ where: { id: link.id }, data: fields });
        } else {
          await tx.bioLink.create({ data: { ...fields, pageId: page.id } });
        }
      }

      await tx.bioPage.update({
        where: { id: page.id },
        data: {
          slug: data.slug,
          published: data.published,
          displayName: data.displayName,
          bio: data.bio,
          avatarMediaId: data.avatarMediaId,
          theme: data.theme,
          socialLinks: data.socialLinks,
        },
      });
    });
  } catch (error) {
    // Another user claimed the username between our check and the write.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(SLUG_TAKEN, { slug: SLUG_TAKEN });
    }
    throw error;
  }

  return ok(await loadEditorData(user.id));
}
