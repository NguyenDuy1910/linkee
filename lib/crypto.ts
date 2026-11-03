import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const VERSION = "v1";

function key(): Buffer {
  const raw = Buffer.from(env().TOKEN_ENCRYPTION_KEY, "base64");
  if (raw.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be base64 for exactly 32 bytes (openssl rand -base64 32)");
  }
  return raw;
}

/** AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext> (base64url parts). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("Unrecognized secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

/** Signed, expiring OAuth `state` bound to a user (CSRF protection for provider callbacks). */
export function signState(data: { userId: string; provider: string }, ttlSeconds = 600): string {
  const body = Buffer.from(
    JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds, n: randomBytes(8).toString("hex") }),
  ).toString("base64url");
  const sig = createHmac("sha256", env().AUTH_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string | null, provider: string): { userId: string } | null {
  if (!state) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", env().AUTH_SECRET).update(body).digest("base64url");
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (data.provider !== provider || typeof data.userId !== "string") return null;
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** HMAC tag for short UI messages passed through redirect URLs, so links can't spoof them. */
export function signNotice(message: string): string {
  return createHmac("sha256", env().AUTH_SECRET).update(`notice:${message}`).digest("base64url").slice(0, 22);
}

export function verifyNotice(message: string | undefined, sig: string | undefined): boolean {
  return Boolean(message && sig && safeEqual(sig, signNotice(message)));
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
