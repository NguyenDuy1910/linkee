/**
 * Per-destination publishing rules, shared by the client composer (live feedback) and the
 * server (authoritative check before anything is queued). Pure: no server imports.
 */

export type PublishProvider = "INSTAGRAM" | "FACEBOOK";
export type MediaKindName = "IMAGE" | "VIDEO";

export interface ComposerMedia {
  kind: MediaKindName;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  mimeType: string;
}

export interface ValidationResult {
  /** Block publishing to this destination. */
  errors: string[];
  /** Informational; publishing still allowed. */
  warnings: string[];
}

export const MAX_MEDIA = 10;

export const CAPTION_LIMITS: Record<PublishProvider, number> = {
  INSTAGRAM: 2200,
  FACEBOOK: 63_206,
};

/** Longest caption any destination accepts (drafts are stored up to this). */
export const MAX_CAPTION_LENGTH = Math.max(...Object.values(CAPTION_LIMITS));

export const INSTAGRAM_LIMITS = {
  hashtags: 30,
  mentions: 20,
  /** Feed photos: 4:5 portrait … 1.91:1 landscape. */
  minAspectRatio: 0.8,
  maxAspectRatio: 1.91,
  imageMaxBytes: 8 * 1024 * 1024,
} as const;

/** Mirrors the upload endpoint's limits so the composer can reject files before uploading. */
export const UPLOAD_RULES = {
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  videoTypes: ["video/mp4", "video/quicktime"],
  imageMaxBytes: 8 * 1024 * 1024,
  videoMaxBytes: 100 * 1024 * 1024,
} as const;

export const ACCEPTED_UPLOAD_TYPES = [...UPLOAD_RULES.imageTypes, ...UPLOAD_RULES.videoTypes].join(",");

export const PROVIDER_LABELS: Record<PublishProvider, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
};

/** Shown when APP_URL is not a public HTTPS origin, so Meta cannot download uploads. */
export const PUBLIC_MEDIA_URL_MESSAGE =
  "Meta must download your media from a public HTTPS address. Set APP_URL to your public https domain.";

// Built with RegExp() so lookbehind/Unicode classes don't depend on the TS target.
const HASHTAG_RE = new RegExp("(?<![\\p{L}\\p{N}_&/])#[\\p{L}\\p{N}_]+", "gu");
const MENTION_RE = new RegExp("(?<![\\p{L}\\p{N}_.@])@[A-Za-z0-9._]+", "gu");

export function countHashtags(text: string): number {
  return text.match(HASHTAG_RE)?.length ?? 0;
}

export function countMentions(text: string): number {
  return text.match(MENTION_RE)?.length ?? 0;
}

/** Small tolerance so exact 4:5 / 1.91:1 crops that round a pixel still pass. */
const RATIO_EPSILON = 0.005;

function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2).replace(/\.?0+$/, "")}:1`;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function validateForProvider(
  provider: PublishProvider,
  input: { caption: string; media: readonly ComposerMedia[] },
): ValidationResult {
  return provider === "INSTAGRAM" ? validateInstagram(input) : validateFacebook(input);
}

function validateInstagram({ caption, media }: { caption: string; media: readonly ComposerMedia[] }): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const limit = CAPTION_LIMITS.INSTAGRAM;

  if (media.length === 0) errors.push("Instagram needs at least one photo or video.");
  if (media.length > MAX_MEDIA) errors.push(`Instagram carousels can include up to ${MAX_MEDIA} photos or videos.`);
  if (caption.length > limit) {
    errors.push(`Caption is ${formatCount(caption.length)} characters; Instagram allows ${formatCount(limit)}.`);
  }
  const hashtags = countHashtags(caption);
  if (hashtags > INSTAGRAM_LIMITS.hashtags) {
    errors.push(`Instagram allows up to ${INSTAGRAM_LIMITS.hashtags} hashtags; this caption has ${hashtags}.`);
  }
  const mentions = countMentions(caption);
  if (mentions > INSTAGRAM_LIMITS.mentions) {
    errors.push(`Instagram allows up to ${INSTAGRAM_LIMITS.mentions} @mentions; this caption has ${mentions}.`);
  }

  media.forEach((item, index) => {
    const label = `${item.kind === "IMAGE" ? "Photo" : "Video"} ${index + 1}`;
    if (item.kind !== "IMAGE") return;
    if (item.mimeType !== "image/jpeg") errors.push(`${label}: Instagram only accepts JPEG photos.`);
    if (item.sizeBytes > INSTAGRAM_LIMITS.imageMaxBytes) errors.push(`${label} is larger than 8 MB.`);
    if (item.width && item.height) {
      const ratio = item.width / item.height;
      if (ratio < INSTAGRAM_LIMITS.minAspectRatio - RATIO_EPSILON) {
        errors.push(`${label} is too tall (${formatRatio(ratio)}). Instagram feed photos must be between 4:5 and 1.91:1.`);
      } else if (ratio > INSTAGRAM_LIMITS.maxAspectRatio + RATIO_EPSILON) {
        errors.push(`${label} is too wide (${formatRatio(ratio)}). Instagram feed photos must be between 4:5 and 1.91:1.`);
      }
    }
  });

  if (media.length === 1 && media[0].kind === "VIDEO") {
    warnings.push("This video will be published as a Reel.");
  }
  if (media.length > 1 && hasMixedImageRatios(media)) {
    warnings.push("Instagram crops every carousel item to the shape of the first one.");
  }
  return { errors, warnings };
}

function hasMixedImageRatios(media: readonly ComposerMedia[]): boolean {
  const ratios = media
    .filter((m) => m.kind === "IMAGE" && m.width && m.height)
    .map((m) => (m.width as number) / (m.height as number));
  return ratios.some((r) => Math.abs(r - ratios[0]) > 0.02);
}

function validateFacebook({ caption, media }: { caption: string; media: readonly ComposerMedia[] }): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const limit = CAPTION_LIMITS.FACEBOOK;
  const images = media.filter((m) => m.kind === "IMAGE").length;
  const videos = media.length - images;

  if (media.length === 0 && caption.trim().length === 0) errors.push("Add text, photos or a video to post on Facebook.");
  if (caption.length > limit) {
    errors.push(`Caption is ${formatCount(caption.length)} characters; Facebook allows ${formatCount(limit)}.`);
  }
  if (images > 0 && videos > 0) {
    errors.push("Facebook posts can't mix photos and videos. Use photos only, or a single video.");
  } else if (videos > 1) {
    errors.push("Facebook Pages can publish one video per post.");
  } else if (images > MAX_MEDIA) {
    errors.push(`Facebook posts can include up to ${MAX_MEDIA} photos.`);
  }
  return { errors, warnings };
}
