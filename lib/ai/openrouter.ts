import "server-only";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { env } from "@/lib/env";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  /** Model that actually served the request (may differ from the configured one when routed). */
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  /** OpenRouter credits charged, in USD. */
  costUsd: number | null;
  latencyMs: number;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 for network failures and timeouts. */
    readonly status: number,
    readonly kind: "auth" | "credits" | "rate_limit" | "timeout" | "network" | "upstream" | "bad_request" | "empty",
    /** Usage numbers when the provider charged for a request that produced no usable reply. */
    readonly usage?: { model: string; promptTokens: number | null; completionTokens: number | null; costUsd: number | null },
  ) {
    super(message);
    this.name = "OpenRouterError";
  }

  /** Worth retrying later (rate limit, provider outage, timeout, network). */
  get isTransient(): boolean {
    return this.kind === "rate_limit" || this.kind === "timeout" || this.kind === "network" || this.kind === "upstream";
  }
}

const responseSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        message: z
          .object({
            content: z
              .union([z.string(), z.array(z.object({ type: z.string().optional(), text: z.string().optional() })), z.null()])
              .optional(),
          })
          .optional(),
      }),
    )
    .default([]),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      cost: z.number().optional(),
    })
    .optional(),
});

/** Non-streaming chat completion via OpenRouter with a timeout and one retry for transient failures. */
export async function chatCompletion(opts: {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<ChatCompletionResult> {
  const e = env();
  if (!e.OPENROUTER_API_KEY) throw new OpenRouterError("AI replies are not configured (OPENROUTER_API_KEY is missing).", 0, "auth");

  const effort = e.OPENROUTER_REASONING_EFFORT.trim();
  const body = JSON.stringify({
    model: e.OPENROUTER_MODEL,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? e.OPENROUTER_MAX_TOKENS,
    temperature: opts.temperature ?? 0.7,
    ...(effort ? { reasoning: { effort } } : {}),
  });

  const started = Date.now();
  let lastError: OpenRouterError | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await attemptOnce(body, e.OPENROUTER_API_KEY, e.APP_URL, e.OPENROUTER_TIMEOUT_MS, e.OPENROUTER_MODEL, started);
    } catch (err) {
      if (!(err instanceof OpenRouterError)) throw err;
      lastError = err;
      // Timeouts are not retried: a second full wait would exceed what a person will sit through.
      const retryable = err.kind === "rate_limit" || err.kind === "upstream" || err.kind === "network";
      if (!retryable || attempt === 1) throw err;
      await sleep(err.kind === "rate_limit" ? 2_000 : 800);
    }
  }
  throw lastError ?? new OpenRouterError("The AI request failed", 0, "network");
}

async function attemptOnce(
  body: string,
  apiKey: string,
  appUrl: string,
  timeoutMs: number,
  configuredModel: string,
  started: number,
): Promise<ChatCompletionResult> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appUrl,
        "X-OpenRouter-Title": "Linkee",
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new OpenRouterError(`The AI took longer than ${Math.round(timeoutMs / 1000)}s to respond. Try again.`, 0, "timeout");
    }
    throw new OpenRouterError("Could not reach the AI provider. Check your connection and try again.", 0, "network");
  }

  const text = await res.text().catch(() => "");
  const json = parseJson(text);
  const providerMessage = extractErrorMessage(json);
  if (!res.ok) throw httpError(res.status, providerMessage);
  // OpenRouter can report upstream failures inside a 200 body.
  if (providerMessage) throw new OpenRouterError(`The AI provider returned an error: ${providerMessage}`, 502, "upstream");

  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) throw new OpenRouterError("The AI returned an unexpected response.", 502, "upstream");
  const data = parsed.data;
  const usage = {
    model: data.model ?? configuredModel,
    promptTokens: data.usage?.prompt_tokens ?? null,
    completionTokens: data.usage?.completion_tokens ?? null,
    costUsd: data.usage?.cost ?? null,
  };
  const raw = data.choices[0]?.message?.content;
  const content = (Array.isArray(raw) ? raw.map((p) => p.text ?? "").join("") : (raw ?? "")).trim();
  if (!content) {
    const reason = data.choices[0]?.finish_reason === "length" ? " (it ran out of tokens)" : "";
    throw new OpenRouterError(`The AI returned an empty reply${reason}.`, 200, "empty", usage);
  }
  return { content, ...usage, latencyMs: Date.now() - started };
}

function httpError(status: number, providerMessage: string | null): OpenRouterError {
  const detail = providerMessage ? ` (${providerMessage})` : "";
  if (status === 401 || status === 403)
    return new OpenRouterError(`OpenRouter rejected the API key. Check OPENROUTER_API_KEY${detail}.`, status, "auth");
  if (status === 402)
    return new OpenRouterError("The OpenRouter account is out of credits. Add credits at openrouter.ai to keep AI replies running.", status, "credits");
  if (status === 429) return new OpenRouterError("The AI provider is busy (rate limited). Try again in a minute.", status, "rate_limit");
  if (status === 408) return new OpenRouterError("The AI took too long to respond. Try again.", status, "timeout");
  if (status >= 500) return new OpenRouterError(`The AI provider is temporarily unavailable${detail}.`, status, "upstream");
  return new OpenRouterError(`The AI request was rejected${detail || ` (HTTP ${status})`}.`, status, "bad_request");
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

const errorBody = z.object({ error: z.union([z.string(), z.object({ message: z.string().optional() })]) });

function extractErrorMessage(json: unknown): string | null {
  const parsed = errorBody.safeParse(json);
  if (!parsed.success) return null;
  const msg = typeof parsed.data.error === "string" ? parsed.data.error : parsed.data.error.message;
  return msg ? msg.slice(0, 300) : null;
}
