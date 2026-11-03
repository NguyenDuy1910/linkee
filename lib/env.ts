import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  /** Public base URL (no trailing slash). Used for OAuth redirects and media URLs. */
  APP_URL: z
    .url()
    .default("http://localhost:3000")
    .transform((v) => v.replace(/\/+$/, "")),
  /** base64-encoded 32-byte key for AES-256-GCM token encryption */
  TOKEN_ENCRYPTION_KEY: z.string().min(1, "TOKEN_ENCRYPTION_KEY is required"),
  MEDIA_DIR: z.string().default("./data/media"),

  INSTAGRAM_APP_ID: optional,
  INSTAGRAM_APP_SECRET: optional,
  /** Where "Upgrade" CTAs point (mailto: or a billing page). Hidden when unset. */
  UPGRADE_URL: optional,
  META_APP_ID: optional,
  META_APP_SECRET: optional,
  META_GRAPH_VERSION: z.string().default("v26.0"),
  META_WEBHOOK_VERIFY_TOKEN: optional,

  OPENROUTER_API_KEY: optional,
  OPENROUTER_MODEL: z.string().default("google/gemini-3.1-flash-lite"),
  OPENROUTER_MAX_TOKENS: z.coerce.number().int().min(16).max(1000).default(120),
  /** "none" disables reasoning tokens (cheapest). Empty string omits the parameter. */
  OPENROUTER_REASONING_EFFORT: z.string().default("none"),
  OPENROUTER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),

  /** Run the Postgres-backed job worker inside the Next.js server process. */
  WORKER_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server environment. Throws a readable error listing every invalid variable. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export function isInstagramConfigured() {
  const e = env();
  return Boolean(e.INSTAGRAM_APP_ID && e.INSTAGRAM_APP_SECRET);
}

export function isFacebookConfigured() {
  const e = env();
  return Boolean(e.META_APP_ID && e.META_APP_SECRET);
}

export function isOpenRouterConfigured() {
  return Boolean(env().OPENROUTER_API_KEY);
}

/** Meta only fetches media from public HTTPS URLs. */
export function isPublicHttpsAppUrl() {
  const url = new URL(env().APP_URL);
  return url.protocol === "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
}
