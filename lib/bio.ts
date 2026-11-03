import { z } from "zod";

/**
 * Link-in-bio domain rules shared by the client editor and the server
 * (no `server-only`): slugs, URL normalization, themes, and the editor payload.
 */

// ───────────────────────────── Slugs ─────────────────────────────

const RESERVED = [
  "dashboard",
  "login",
  "signup",
  "api",
  "media",
  "go",
  "settings",
  "admin",
  "app",
  "auth",
  "about",
  "pricing",
  "privacy",
  "terms",
  "help",
  "support",
  "blog",
  "static",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
] as const;

export const RESERVED_SLUGS: Readonly<Record<string, true>> = Object.fromEntries(RESERVED.map((s) => [s, true]));

export function isReservedSlug(slug: string): boolean {
  return Object.hasOwn(RESERVED_SLUGS, slug);
}

export const SLUG_MIN = 3;
export const SLUG_MAX = 30;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SLUG_MIN, `Use at least ${SLUG_MIN} characters`)
  .max(SLUG_MAX, `Use at most ${SLUG_MAX} characters`)
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers, dots, dashes or underscores, starting and ending with a letter or number")
  .refine((slug) => !isReservedSlug(slug), "That username is reserved");

/** Best-effort username suggestion from an email local-part (plus-tags dropped). Empty when nothing usable remains. */
export function suggestSlug(input: string): string {
  const cleaned = input
    .split("+")[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, SLUG_MAX)
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  return slugSchema.safeParse(cleaned).success ? cleaned : "";
}

// ───────────────────────────── URLs ─────────────────────────────

export const URL_MAX = 2048;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/i;

/**
 * Normalizes user-entered link targets. Bare domains get `https://`.
 * Only http(s), mailto and tel survive; everything else (javascript:, data:, …) → null.
 */
export function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value || value.length > URL_MAX || /[\s\u0000-\u001f\u007f]/.test(value)) return null;

  const scheme = SCHEME_PATTERN.exec(value)?.[1]?.toLowerCase();
  if (scheme === "mailto") {
    const address = value.slice("mailto:".length);
    return EMAIL_PATTERN.test(address.split("?")[0]) ? `mailto:${address}` : null;
  }
  if (scheme === "tel") {
    const number = value.slice("tel:".length).replace(/[().-]/g, "");
    return /^\+?[0-9]{3,20}$/.test(number) ? `tel:${number}` : null;
  }

  let candidate = value;
  if (value.startsWith("//")) {
    candidate = `https:${value}`;
  } else if (scheme !== "http" && scheme !== "https") {
    // "example.com:8080/x" looks like a scheme but is a host with a port.
    const hostWithPort = scheme !== undefined && /^[^/]+:\d/.test(value) && scheme.includes(".");
    if (scheme !== undefined && !hostWithPort) return null;
    candidate = `https://${value}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname;
  if (!host || (!host.includes(".") && host !== "localhost") || host.startsWith(".") || host.endsWith(".")) return null;
  return url.href;
}

/** Accepts `name@example.com` or `mailto:name@example.com`. */
export function normalizeEmailLink(input: string): string | null {
  const value = input.trim().replace(/^mailto:/i, "");
  return EMAIL_PATTERN.test(value) && value.length <= 254 ? `mailto:${value}` : null;
}

/** Whether a stored URL is safe to redirect to / render as href. */
export function isSafeLinkUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(url);
}

const linkUrlSchema = z
  .string()
  .max(URL_MAX, "That URL is too long")
  .transform((value, ctx) => {
    const url = normalizeUrl(value);
    if (!url) {
      ctx.addIssue({ code: "custom", message: value.trim() ? "Enter a valid web address" : "Add a URL" });
      return z.NEVER;
    }
    return url;
  });

// ───────────────────────────── Social icons ─────────────────────────────

export const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourname" },
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourname" },
  { id: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourname" },
  { id: "x", label: "X", placeholder: "https://x.com/yourname" },
  { id: "threads", label: "Threads", placeholder: "https://threads.net/@yourname" },
  { id: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { id: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourname" },
  { id: "github", label: "GitHub", placeholder: "https://github.com/yourname" },
  { id: "telegram", label: "Telegram", placeholder: "https://t.me/yourname" },
  { id: "email", label: "Email", placeholder: "you@example.com" },
  { id: "website", label: "Website", placeholder: "https://yourwebsite.com" },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["id"];
const SOCIAL_PLATFORM_IDS = SOCIAL_PLATFORMS.map((p) => p.id) as [SocialPlatform, ...SocialPlatform[]];
export const MAX_SOCIAL_LINKS = 12;

export function socialPlatformLabel(id: SocialPlatform): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

export const socialLinkSchema = z
  .object({
    platform: z.enum(SOCIAL_PLATFORM_IDS, "Choose a platform"),
    url: z.string().max(URL_MAX, "That URL is too long"),
  })
  .transform((value, ctx) => {
    const url = value.platform === "email" ? normalizeEmailLink(value.url) : normalizeUrl(value.url);
    if (!url) {
      const message = value.platform === "email" ? "Enter a valid email address" : "Enter a valid web address";
      ctx.addIssue({ code: "custom", message: value.url.trim() ? message : "Add a URL", path: ["url"] });
      return z.NEVER;
    }
    return { platform: value.platform, url };
  });

export const socialLinksSchema = z
  .array(socialLinkSchema)
  .max(MAX_SOCIAL_LINKS, `Add up to ${MAX_SOCIAL_LINKS} social icons`)
  .superRefine((links, ctx) => {
    const seen = new Set<string>();
    links.forEach((link, index) => {
      if (seen.has(link.platform)) {
        ctx.addIssue({ code: "custom", message: "This platform is already added", path: [index, "platform"] });
      }
      seen.add(link.platform);
    });
  });

export type SocialLink = z.output<typeof socialLinkSchema>;

/** Stored JSON → valid social links (invalid entries dropped). */
export function parseStoredSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = socialLinkSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

// ───────────────────────────── Themes ─────────────────────────────

export const FONTS = [
  { id: "sans", label: "Sans", stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: "serif", label: "Serif", stack: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
  { id: "mono", label: "Mono", stack: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace' },
  { id: "rounded", label: "Rounded", stack: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", system-ui, sans-serif' },
] as const;
export type ThemeFont = (typeof FONTS)[number]["id"];

export const BUTTON_SHAPES = [
  { id: "rounded", label: "Rounded", radius: "14px" },
  { id: "pill", label: "Pill", radius: "9999px" },
  { id: "square", label: "Square", radius: "4px" },
] as const;
export type ButtonShape = (typeof BUTTON_SHAPES)[number]["id"];

export const BUTTON_FILLS = [
  { id: "solid", label: "Solid" },
  { id: "outline", label: "Outline" },
  { id: "soft", label: "Soft" },
] as const;
export type ButtonFill = (typeof BUTTON_FILLS)[number]["id"];

export interface ThemePreset {
  id: string;
  label: string;
  /** CSS background (solid color or gradient). */
  background: string;
  /** Representative solid color of the background (used for contrast + browser chrome). */
  baseColor: string;
  text: string;
  muted: string;
  /** Solid button color. */
  accent: string;
  /** Text color on the solid button. */
  accentText: string;
}

export const THEME_PRESETS = [
  {
    id: "minimal",
    label: "Minimal",
    background: "#fafafa",
    baseColor: "#fafafa",
    text: "#18181b",
    muted: "#52525b",
    accent: "#18181b",
    accentText: "#ffffff",
  },
  {
    id: "midnight",
    label: "Midnight",
    background: "linear-gradient(180deg, #0b1020 0%, #151b33 100%)",
    baseColor: "#10152a",
    text: "#f4f5fb",
    muted: "#a7adc6",
    accent: "#f4f5fb",
    accentText: "#10152a",
  },
  {
    id: "sunset",
    label: "Sunset",
    background: "linear-gradient(160deg, #ffb88c 0%, #ff8a7a 45%, #de6fa1 100%)",
    baseColor: "#ff8a7a",
    text: "#2a0f1c",
    muted: "#5b2a3d",
    accent: "#2a0f1c",
    accentText: "#fff4ef",
  },
  {
    id: "forest",
    label: "Forest",
    background: "#16302b",
    baseColor: "#16302b",
    text: "#eef5ef",
    muted: "#a9c2b4",
    accent: "#d9ead3",
    accentText: "#16302b",
  },
  {
    id: "lavender",
    label: "Lavender",
    background: "linear-gradient(180deg, #f3efff 0%, #e6defc 100%)",
    baseColor: "#ece6fe",
    text: "#2b2045",
    muted: "#5f5480",
    accent: "#5b45c9",
    accentText: "#ffffff",
  },
  {
    id: "sand",
    label: "Sand",
    background: "#f3ece1",
    baseColor: "#f3ece1",
    text: "#3b2f24",
    muted: "#6e5e4e",
    accent: "#3b2f24",
    accentText: "#f8f3ea",
  },
] as const satisfies readonly ThemePreset[];

export type ThemePresetId = (typeof THEME_PRESETS)[number]["id"];
const PRESET_IDS = THEME_PRESETS.map((p) => p.id) as [ThemePresetId, ...ThemePresetId[]];

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #1f2937")
  .transform((v) => v.toLowerCase());

export const themeSchema = z.object({
  preset: z.enum(PRESET_IDS).default("minimal"),
  font: z.enum(FONTS.map((f) => f.id) as [ThemeFont, ...ThemeFont[]]).default("sans"),
  buttonShape: z.enum(BUTTON_SHAPES.map((s) => s.id) as [ButtonShape, ...ButtonShape[]]).default("rounded"),
  buttonFill: z.enum(BUTTON_FILLS.map((f) => f.id) as [ButtonFill, ...ButtonFill[]]).default("solid"),
  background: hexColor.optional(),
  text: hexColor.optional(),
  accent: hexColor.optional(),
});

export type Theme = z.output<typeof themeSchema>;

export const DEFAULT_THEME: Theme = { preset: "minimal", font: "sans", buttonShape: "rounded", buttonFill: "solid" };

/** Stored JSON → valid theme (falls back to defaults field-by-field where possible). */
export function parseStoredTheme(value: unknown): Theme {
  const parsed = themeSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : DEFAULT_THEME;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

/** WCAG relative luminance (0–1) of a #rrggbb color. */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Near-black or white, whichever reads better on `background`. */
export function readableTextOn(background: string): string {
  return contrastRatio(background, "#111111") >= contrastRatio(background, "#ffffff") ? "#111111" : "#ffffff";
}

export interface ResolvedTheme {
  background: string;
  baseColor: string;
  text: string;
  muted: string;
  fontFamily: string;
  isDark: boolean;
  button: { background: string; color: string; border: string; radius: string };
}

export function getPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];
}

/** Merges preset + overrides into concrete CSS values, keeping text readable. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  const preset = getPreset(theme.preset);
  const baseColor = theme.background ?? preset.baseColor;
  const background = theme.background ?? preset.background;

  // A custom background without a custom text color gets an automatically readable text color.
  let text: string = theme.text ?? preset.text;
  if (!theme.text && theme.background && contrastRatio(baseColor, text) < 4.5) text = readableTextOn(baseColor);
  const muted = theme.text || text !== preset.text ? `color-mix(in srgb, ${text} 72%, ${baseColor})` : preset.muted;

  const accent = theme.accent ?? (text !== preset.text ? text : preset.accent);
  const accentText = theme.accent || accent !== preset.accent ? readableTextOn(accent) : preset.accentText;
  const radius = BUTTON_SHAPES.find((s) => s.id === theme.buttonShape)?.radius ?? BUTTON_SHAPES[0].radius;

  const button =
    theme.buttonFill === "outline"
      ? { background: "transparent", color: text, border: accent, radius }
      : theme.buttonFill === "soft"
        ? { background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: text, border: "transparent", radius }
        : { background: accent, color: accentText, border: accent, radius };

  return {
    background,
    baseColor,
    text,
    muted,
    fontFamily: FONTS.find((f) => f.id === theme.font)?.stack ?? FONTS[0].stack,
    isDark: luminance(baseColor) < 0.35,
    button,
  };
}

// ───────────────────────────── Editor payload ─────────────────────────────

export const DISPLAY_NAME_MAX = 60;
export const BIO_MAX = 160;
export const LINK_TITLE_MAX = 80;
export const MAX_LINKS = 50;

export const bioLinkInputSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  title: z.string().trim().min(1, "Add a title").max(LINK_TITLE_MAX, `Keep titles under ${LINK_TITLE_MAX} characters`),
  url: linkUrlSchema,
  isActive: z.boolean(),
});

export const bioPageInputSchema = z.object({
  slug: slugSchema,
  published: z.boolean(),
  displayName: z
    .string()
    .trim()
    .min(1, "Add a display name")
    .max(DISPLAY_NAME_MAX, `Keep your name under ${DISPLAY_NAME_MAX} characters`),
  bio: z.string().trim().max(BIO_MAX, `Keep your bio under ${BIO_MAX} characters`),
  avatarMediaId: z.string().min(1).max(64).nullable(),
  theme: themeSchema,
  socialLinks: socialLinksSchema,
  links: z.array(bioLinkInputSchema).max(MAX_LINKS, `Add up to ${MAX_LINKS} links`),
});

export type BioPageInput = z.input<typeof bioPageInputSchema>;
export type BioPageData = z.output<typeof bioPageInputSchema>;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "").slice(0, 2);
  return letters.toUpperCase() || "?";
}
