import "server-only";
import { DEFAULT_THEME, parseStoredSocialLinks, parseStoredTheme, suggestSlug, type SocialLink, type Theme } from "@/lib/bio";
import { db } from "@/lib/db";

export interface EditorLinkData {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  clicks: number;
}

/** Everything the editor needs; safe to send to the client. */
export interface BioEditorData {
  slug: string;
  published: boolean;
  displayName: string;
  bio: string;
  avatar: { id: string; url: string } | null;
  theme: Theme;
  socialLinks: SocialLink[];
  links: EditorLinkData[];
}

const editorSelect = {
  id: true,
  slug: true,
  published: true,
  displayName: true,
  bio: true,
  theme: true,
  socialLinks: true,
  avatar: { select: { id: true, storageKey: true } },
  links: {
    orderBy: { position: "asc" },
    select: { id: true, title: true, url: true, isActive: true, clicks: true },
  },
} as const;

async function createMissingPage(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true } });
  const base = suggestSlug(user.email.split("@")[0]) || "page";
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base.slice(0, 24)}-${Math.random().toString(36).slice(2, 6)}`;
    const taken = await db.bioPage.findUnique({ where: { slug }, select: { id: true } });
    if (taken) continue;
    return db.bioPage.upsert({
      where: { userId },
      update: {},
      create: { userId, slug, displayName: user.name || slug, theme: DEFAULT_THEME, socialLinks: [] },
      select: editorSelect,
    });
  }
  throw new Error("Could not allocate a username for this page");
}

/** Loads the user's page (creating one if it is somehow missing). */
export async function loadEditorData(userId: string): Promise<BioEditorData> {
  const page = (await db.bioPage.findUnique({ where: { userId }, select: editorSelect })) ?? (await createMissingPage(userId));
  return {
    slug: page.slug,
    published: page.published,
    displayName: page.displayName,
    bio: page.bio,
    avatar: page.avatar ? { id: page.avatar.id, url: `/media/${page.avatar.storageKey}` } : null,
    theme: parseStoredTheme(page.theme),
    socialLinks: parseStoredSocialLinks(page.socialLinks),
    links: page.links,
  };
}
