import { NextResponse, type NextRequest } from "next/server";
import { encryptSecret, signNotice, verifyState } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env, isInstagramConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import {
  COMMENTS_SCOPE,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchInstagramProfile,
  subscribeToCommentWebhooks,
  type InstagramProfile,
} from "@/lib/social/instagram";
import { describeMetaError } from "@/lib/social/meta";

function settingsRedirect(params: Record<string, string>) {
  const url = new URL("/dashboard/settings", env().APP_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.hash = "accounts";
  return NextResponse.redirect(url);
}

function fail(code: string, message: string) {
  return settingsRedirect({ error: code, message, sig: signNotice(message) });
}

/** OAuth redirect target for Instagram Login. Never logs tokens. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", env().APP_URL));
  if (!isInstagramConfigured()) return settingsRedirect({ error: "instagram_not_configured" });

  const params = request.nextUrl.searchParams;
  const providerError = params.get("error");
  // Cancelling changes nothing, so report it even if Meta dropped the state parameter.
  if (providerError === "access_denied" || params.get("error_reason") === "user_denied") {
    return fail("access_denied", "Instagram connection was cancelled. Nothing was connected.");
  }

  const state = verifyState(params.get("state"), "instagram");
  if (!state || state.userId !== user.id) {
    return fail("invalid_state", "This connection link expired or was started from another session. Please try connecting again.");
  }
  if (providerError) {
    return fail("instagram_error", params.get("error_description") || `Instagram returned an error: ${providerError}`);
  }
  const code = params.get("code")?.replace(/#_$/, "");
  if (!code) return fail("instagram_error", "Instagram didn't return an authorization code. Please try again.");

  let accessToken: string;
  let expiresAt: Date;
  let scopes: string[];
  let profile: InstagramProfile;
  try {
    const short = await exchangeCodeForToken(code);
    scopes = short.permissions;
    const long = await exchangeForLongLivedToken(short.accessToken);
    accessToken = long.accessToken;
    expiresAt = long.expiresAt;
    profile = await fetchInstagramProfile(accessToken);
  } catch (err) {
    console.warn(`[instagram] OAuth exchange failed for user ${user.id}: ${err instanceof Error ? err.message : err}`);
    return fail("instagram_error", `Couldn't connect Instagram: ${describeMetaError(err)}`);
  }

  if (profile.accountType && !["BUSINESS", "MEDIA_CREATOR"].includes(profile.accountType)) {
    return fail(
      "not_professional",
      `@${profile.username} is a personal account. Switch it to a Professional (Creator or Business) account in the Instagram app, then connect again.`,
    );
  }

  const existing = await db.socialAccount.findUnique({
    where: { provider_providerAccountId: { provider: "INSTAGRAM", providerAccountId: profile.userId } },
    select: { id: true, userId: true },
  });
  if (existing && existing.userId !== user.id) {
    return fail("already_connected", "This Instagram account is already connected to another Linkee account.");
  }
  if (!existing) {
    const count = await db.socialAccount.count({ where: { userId: user.id } });
    if (count >= user.entitlements.maxSocialAccounts) {
      return fail(
        "account_limit",
        `Your ${user.entitlements.label} plan allows ${user.entitlements.maxSocialAccounts} connected accounts. Disconnect one to add another.`,
      );
    }
  }

  const missingComments = scopes.length > 0 && !scopes.includes(COMMENTS_SCOPE);
  const statusMessage = missingComments
    ? "Comment access wasn't granted. Reconnect and allow “Manage comments” to use the Inbox."
    : null;
  const tokenFields = {
    username: profile.username,
    displayName: profile.name || profile.username,
    avatarUrl: profile.profilePictureUrl,
    accountType: profile.accountType,
    scopes,
    accessTokenEnc: encryptSecret(accessToken),
    tokenExpiresAt: expiresAt,
    tokenRefreshedAt: new Date(),
    status: "ACTIVE" as const,
    statusMessage,
  };
  const account = await db.socialAccount.upsert({
    where: { provider_providerAccountId: { provider: "INSTAGRAM", providerAccountId: profile.userId } },
    create: { userId: user.id, provider: "INSTAGRAM", providerAccountId: profile.userId, ...tokenFields },
    update: tokenFields,
    select: { id: true },
  });

  // Real-time comments need a Live app with Advanced Access; without it the Inbox uses Refresh.
  const subscription = missingComments ? { subscribed: false } : await subscribeToCommentWebhooks(accessToken);
  if (!subscription.subscribed && "error" in subscription && subscription.error) {
    console.info(`[instagram] webhook subscription unavailable for ${account.id}: ${subscription.error}`);
  }
  await db.socialAccount.update({
    where: { id: account.id },
    data: subscription.subscribed ? { webhooksSubscribed: true } : { webhooksSubscribed: false, autoReplyEnabled: false },
  });

  return settingsRedirect({ connected: "instagram" });
}
