import "server-only";
import { setTimeout as sleep } from "node:timers/promises";

/**
 * Minimal fetch wrapper for Meta Graph hosts (graph.instagram.com, graph.facebook.com,
 * api.instagram.com). Timeouts, bounded retries for transient failures, and errors that
 * carry Meta's own message so the UI can show it in plain language.
 */

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly subcode?: number,
    readonly fbtraceId?: string,
  ) {
    super(message);
    this.name = "MetaApiError";
  }

  /** Token expired/revoked or permission removed → the user must reconnect. */
  get isAuthError(): boolean {
    return this.code === 190 || this.code === 102 || this.code === 10 || (this.code !== undefined && this.code >= 200 && this.code < 300);
  }

  /** Worth retrying later: network, 5xx, throttling. */
  get isTransient(): boolean {
    if (this.status === 0 || this.status >= 500) return true;
    return [1, 2, 4, 17, 32, 341, 613].includes(this.code ?? -1);
  }

  /**
   * Throttled before any work was done, so even a non-idempotent POST (publish, reply) is
   * safe to repeat. 5xx/network/code 1–2 are NOT: the object may already exist on Meta.
   */
  get isRateLimited(): boolean {
    return [4, 17, 32, 341, 613].includes(this.code ?? -1);
  }
}

interface MetaRequestOptions {
  method?: "GET" | "POST" | "DELETE";
  /** Sent as query string for GET/DELETE, as form body for POST. */
  params?: Record<string, string | number | boolean | undefined>;
  /** Bearer token. Never logged. */
  accessToken?: string;
  timeoutMs?: number;
  /** Extra attempts for transient failures on idempotent calls. POSTs default to 0. */
  retries?: number;
}

export async function metaRequest<T>(url: string, opts: MetaRequestOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const retries = opts.retries ?? (method === "GET" ? 2 : 0);
  const target = new URL(url);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v === undefined) continue;
    if (method === "POST") body.set(k, String(v));
    else target.searchParams.set(k, String(v));
  }

  let lastError: MetaApiError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** attempt);
    try {
      const res = await fetch(target, {
        method,
        headers: opts.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : undefined,
        body: method === "POST" ? body : undefined,
        signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
        cache: "no-store",
      });
      const text = await res.text();
      const json = text ? safeJson(text) : {};
      if (!res.ok || (json && typeof json === "object" && "error" in json && json.error)) {
        lastError = toMetaError(res.status, json);
        if (lastError.isTransient && attempt < retries) continue;
        throw lastError;
      }
      return json as T;
    } catch (err) {
      if (err instanceof MetaApiError) throw err;
      const reason = err instanceof Error && err.name === "TimeoutError" ? "Request to Meta timed out" : "Could not reach Meta";
      lastError = new MetaApiError(reason, 0);
      if (attempt < retries) continue;
      throw lastError;
    }
  }
  throw lastError ?? new MetaApiError("Unknown Meta API error", 0);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 300) } };
  }
}

function toMetaError(status: number, json: unknown): MetaApiError {
  const j = (json ?? {}) as Record<string, unknown>;
  const e = (j.error ?? {}) as Record<string, unknown>;
  // Instagram OAuth endpoints use { error_type, code, error_message }.
  const message =
    (typeof e.error_user_msg === "string" && e.error_user_msg) ||
    (typeof e.message === "string" && e.message) ||
    (typeof j.error_message === "string" && j.error_message) ||
    (typeof j.error === "string" && j.error) ||
    `Meta API request failed (HTTP ${status})`;
  const code = typeof e.code === "number" ? e.code : typeof j.code === "number" ? j.code : undefined;
  const subcode = typeof e.error_subcode === "number" ? e.error_subcode : undefined;
  const trace = typeof e.fbtrace_id === "string" ? e.fbtrace_id : undefined;
  return new MetaApiError(message, status, code, subcode, trace);
}

/** Human-readable message for UI. */
export function describeMetaError(err: unknown): string {
  if (err instanceof MetaApiError) {
    if (err.isAuthError) return `${err.message} — reconnect this account in Settings.`;
    return err.message;
  }
  return err instanceof Error ? err.message : "Unexpected error";
}
