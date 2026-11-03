import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BioPageView } from "@/components/bio/bio-page-view";
import { isReservedSlug, parseStoredSocialLinks, parseStoredTheme, resolveTheme } from "@/lib/bio";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const getPublishedPage = cache(async (rawSlug: string) => {
  const slug = rawSlug.toLowerCase();
  if (slug.length > 30 || isReservedSlug(slug)) return null;
  const page = await db.bioPage.findUnique({
    where: { slug },
    select: {
      slug: true,
      displayName: true,
      bio: true,
      theme: true,
      socialLinks: true,
      published: true,
      avatar: { select: { storageKey: true } },
      links: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, title: true, url: true } },
    },
  });
  return page?.published ? page : null;
});

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const page = await getPublishedPage((await params).slug);
  if (!page) return { title: "Page not found", robots: { index: false } };
  const base = env().APP_URL;
  const description = page.bio.trim() || `${page.displayName} on Linkee`;
  const image = page.avatar ? `${base}/media/${page.avatar.storageKey}` : undefined;
  return {
    title: { absolute: `${page.displayName} | Linkee` },
    description,
    alternates: { canonical: `${base}/${page.slug}` },
    openGraph: {
      type: "profile",
      title: page.displayName,
      description,
      url: `${base}/${page.slug}`,
      images: image ? [{ url: image, width: 400, height: 400, alt: page.displayName }] : undefined,
    },
    twitter: { card: "summary", title: page.displayName, description, images: image ? [image] : undefined },
  };
}

export async function generateViewport({ params }: PageProps<"/[slug]">): Promise<Viewport> {
  const page = await getPublishedPage((await params).slug);
  return page ? { themeColor: resolveTheme(parseStoredTheme(page.theme)).baseColor } : {};
}

export default async function PublicBioPage({ params }: PageProps<"/[slug]">) {
  const page = await getPublishedPage((await params).slug);
  if (!page) notFound();

  return (
    <BioPageView
      className="min-h-dvh"
      page={{
        displayName: page.displayName,
        bio: page.bio,
        avatarUrl: page.avatar ? `/media/${page.avatar.storageKey}` : null,
        theme: parseStoredTheme(page.theme),
        socialLinks: parseStoredSocialLinks(page.socialLinks),
        links: page.links,
      }}
      linkHref={(link) => `/go/${link.id}`}
    />
  );
}
