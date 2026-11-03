import type { BioEditorData } from "@/app/dashboard/my-page/data";
import type { BioViewPage } from "@/components/bio/bio-page-view";
import { normalizeEmailLink, normalizeUrl, type BioPageInput, type SocialPlatform, type Theme } from "@/lib/bio";

export interface EditorLink {
  key: string;
  id?: string;
  title: string;
  url: string;
  isActive: boolean;
  clicks: number;
}

export interface EditorSocial {
  key: string;
  platform: SocialPlatform;
  url: string;
}

export interface EditorState {
  slug: string;
  published: boolean;
  displayName: string;
  bio: string;
  avatar: { id: string; url: string } | null;
  theme: Theme;
  socialLinks: EditorSocial[];
  links: EditorLink[];
}

/** Field errors keyed by stable item keys: `displayName`, `link:<key>:title`, `social:<key>:url`, … */
export type EditorErrors = Record<string, string>;

let sequence = 0;
export function newKey(prefix: string): string {
  sequence += 1;
  return `${prefix}-new-${sequence}`;
}

export function fromData(data: BioEditorData): EditorState {
  return {
    slug: data.slug,
    published: data.published,
    displayName: data.displayName,
    bio: data.bio,
    avatar: data.avatar,
    theme: data.theme,
    socialLinks: data.socialLinks.map((s) => ({ key: `social-${s.platform}`, platform: s.platform, url: s.url })),
    links: data.links.map((l) => ({ key: l.id, ...l })),
  };
}

export function toInput(state: EditorState): BioPageInput {
  return {
    slug: state.slug,
    published: state.published,
    displayName: state.displayName,
    bio: state.bio,
    avatarMediaId: state.avatar?.id ?? null,
    theme: state.theme,
    socialLinks: state.socialLinks.map(({ platform, url }) => ({ platform, url })),
    links: state.links.map(({ id, title, url, isActive }) => ({ id, title, url, isActive })),
  };
}

export function serialize(state: EditorState): string {
  return JSON.stringify(toInput(state));
}

/** What the live preview renders: visible, titled links and valid social URLs only. */
export function toPreview(state: EditorState): BioViewPage {
  return {
    displayName: state.displayName,
    bio: state.bio,
    avatarUrl: state.avatar?.url ?? null,
    theme: state.theme,
    socialLinks: state.socialLinks.flatMap((s) => {
      const url = s.platform === "email" ? normalizeEmailLink(s.url) : normalizeUrl(s.url);
      return url ? [{ platform: s.platform, url }] : [];
    }),
    links: state.links
      .filter((l) => l.isActive && l.title.trim())
      .map((l) => ({ id: l.key, title: l.title.trim(), url: normalizeUrl(l.url) ?? "" })),
  };
}

/** Server errors use array indexes (`links.2.url`); remap them to the keys of the submitted state. */
export function mapServerErrors(fieldErrors: Record<string, string> | undefined, submitted: EditorState): EditorErrors {
  const out: EditorErrors = {};
  for (const [path, message] of Object.entries(fieldErrors ?? {})) {
    const [root, index, field] = path.split(".");
    if (root === "links" && index !== undefined && field) {
      const link = submitted.links[Number(index)];
      if (link) out[`link:${link.key}:${field}`] = message;
    } else if (root === "socialLinks" && index !== undefined && field) {
      const social = submitted.socialLinks[Number(index)];
      if (social) out[`social:${social.key}:${field}`] = message;
    } else {
      out[root === "theme" && index ? `theme.${index}` : root] = message;
    }
  }
  return out;
}
