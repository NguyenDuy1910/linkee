import "server-only";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import type { SocialAccount } from "@/lib/generated/prisma/client";
import { MetaApiError, metaRequest } from "@/lib/social/meta";

/** Instagram long-lived tokens last 60 days; refresh when fewer than 10 days remain. */
const IG_REFRESH_WINDOW_MS = 10 * 86_400_000;
/** Instagram only allows refreshing tokens that are at least 24 hours old. */
const IG_MIN_TOKEN_AGE_MS = 86_400_000;

export class ReconnectRequiredError extends Error {
  constructor(readonly accountId: string, message = "This account needs to be reconnected.") {
    super(message);
    this.name = "ReconnectRequiredError";
  }
}

export async function markNeedsReconnect(accountId: string, message: string): Promise<void> {
  await db.socialAccount.update({
    where: { id: accountId },
    data: { status: "NEEDS_RECONNECT", statusMessage: message.slice(0, 500) },
  });
}

/**
 * Decrypted access token for API calls (server-only). Refreshes an Instagram token close to
 * expiry. Throws ReconnectRequiredError when the connection is unusable.
 */
export async function getAccessToken(account: SocialAccount): Promise<string> {
  if (account.status === "NEEDS_RECONNECT") throw new ReconnectRequiredError(account.id, account.statusMessage ?? undefined);
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() <= Date.now()) {
    await markNeedsReconnect(account.id, "Access token expired. Reconnect to continue.");
    throw new ReconnectRequiredError(account.id, "Access token expired. Reconnect to continue.");
  }
  const token = decryptSecret(account.accessTokenEnc);
  if (account.provider === "INSTAGRAM" && shouldRefreshInstagram(account)) {
    try {
      return await refreshInstagramToken(account.id, token);
    } catch (err) {
      // A failed refresh is not fatal while the current token is still valid.
      console.warn(`[tokens] Instagram refresh failed for ${account.id}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return token;
}

function shouldRefreshInstagram(account: SocialAccount): boolean {
  if (!account.tokenExpiresAt) return false;
  const issuedAt = (account.tokenRefreshedAt ?? account.createdAt).getTime();
  return account.tokenExpiresAt.getTime() - Date.now() < IG_REFRESH_WINDOW_MS && Date.now() - issuedAt > IG_MIN_TOKEN_AGE_MS;
}

async function refreshInstagramToken(accountId: string, token: string): Promise<string> {
  const res = await metaRequest<{ access_token: string; expires_in: number }>(
    `https://graph.instagram.com/refresh_access_token`,
    { params: { grant_type: "ig_refresh_token", access_token: token } },
  );
  await db.socialAccount.update({
    where: { id: accountId },
    data: {
      accessTokenEnc: encryptSecret(res.access_token),
      tokenExpiresAt: new Date(Date.now() + res.expires_in * 1000),
      tokenRefreshedAt: new Date(),
    },
  });
  return res.access_token;
}

/** Job handler (daily): keep every active Instagram token fresh, flag dead ones. */
export async function handleRefreshInstagramTokens(): Promise<void> {
  const soon = new Date(Date.now() + IG_REFRESH_WINDOW_MS);
  const accounts = await db.socialAccount.findMany({
    where: { provider: "INSTAGRAM", status: "ACTIVE", tokenExpiresAt: { lt: soon } },
  });
  for (const account of accounts) {
    try {
      await getAccessToken(account);
    } catch (err) {
      if (err instanceof MetaApiError && err.isAuthError) await markNeedsReconnect(account.id, err.message);
    }
  }
}

/**
 * Call after a provider request fails: auth errors flip the account to NEEDS_RECONNECT so
 * the UI shows the Reconnect action. Re-throws nothing; returns whether reconnect is needed.
 */
export async function noteProviderError(accountId: string, err: unknown): Promise<boolean> {
  if (err instanceof ReconnectRequiredError) return true;
  if (err instanceof MetaApiError && err.isAuthError) {
    await markNeedsReconnect(accountId, err.message);
    return true;
  }
  return false;
}
