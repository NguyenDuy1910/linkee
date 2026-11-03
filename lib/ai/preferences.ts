import { z } from "zod";

/** Client-safe AI preference options and validation shared by Settings UI and server actions. */

export const TONE_OPTIONS = [
  { value: "FRIENDLY", label: "Friendly", description: "Warm and approachable, like talking to a regular." },
  { value: "PROFESSIONAL", label: "Professional", description: "Polished and courteous. Good for brands and services." },
  { value: "PLAYFUL", label: "Playful", description: "Light and fun, with the occasional emoji." },
] as const;

export type ToneValue = (typeof TONE_OPTIONS)[number]["value"];

export const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Match the commenter's language" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "vi", label: "Vietnamese" },
  { value: "id", label: "Indonesian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh-Hans", label: "Chinese (Simplified)" },
  { value: "hi", label: "Hindi" },
] as const;

export const BRAND_CONTEXT_MAX = 500;
export const SKIP_KEYWORDS_MAX = 30;
export const SKIP_KEYWORD_MAX_LENGTH = 40;

const languageValues = LANGUAGE_OPTIONS.map((l) => l.value) as [string, ...string[]];

/** Comma/newline separated → trimmed, de-duplicated (case-insensitive) list. */
export function splitKeywords(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const k = raw.trim();
    if (!k || seen.has(k.toLowerCase())) continue;
    seen.add(k.toLowerCase());
    out.push(k);
  }
  return out;
}

export const aiPreferencesSchema = z.object({
  tone: z.enum(["FRIENDLY", "PROFESSIONAL", "PLAYFUL"], { error: "Choose a tone" }),
  language: z.enum(languageValues, { error: "Choose a language" }),
  brandContext: z.string().trim().max(BRAND_CONTEXT_MAX, `Keep brand context under ${BRAND_CONTEXT_MAX} characters`),
  skipKeywords: z
    .string()
    .transform(splitKeywords)
    .pipe(
      z
        .array(z.string().max(SKIP_KEYWORD_MAX_LENGTH, `Each keyword must be ${SKIP_KEYWORD_MAX_LENGTH} characters or fewer`))
        .max(SKIP_KEYWORDS_MAX, `Use at most ${SKIP_KEYWORDS_MAX} keywords`),
    ),
});

export type AiPreferencesInput = z.input<typeof aiPreferencesSchema>;
