import { NextResponse, type NextRequest } from "next/server";
import { encryptSecret, signNotice, verifyState } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env, isFacebookConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import {
  exchangeFacebookCode,
  getGrantedPermissions,
  listPages,
  REQUIRED_FACEBOOK_SCOPES,
  type FacebookPage,
} from "@/lib/social/facebook";
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

/** OAuth redirect target for Facebook Login for Pages. Connects every shared Page. Never logs tokens. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", env().APP_URL));
  if (!isFacebookConfigured()) return settingsRedirect({ error: "facebook_not_configured" });

  const params = request.nextUrl.searchParams;
  const providerError = params.get("error");
  // Cancelling changes nothing, so report it even if Meta dropped the state parameter.
  if (providerError === "access_denied" || params.get("error_reason") === "user_denied") {
    return fail("access_denied", "Facebook connection was cancelled. Nothing was connected.");
  }

  const state = verifyState(params.get("state"), "facebook");
  if (!state || state.userId !== user.id) {
    return fail("invalid_state", "This connection link expired or was started from another session. Please try connecting again.");
  }
  if (providerError) {
    return fail("facebook_error", params.get("error_description") || `Facebook returned an error: ${providerError}`);
  }
  const code = params.get("code");
  if (!code) return fail("facebook_error", "Facebook didn't return an authorization code. Please try again.");

  let scopes: string[];
  let pages: FacebookPage[];
  try {
    const userToken = await exchangeFacebookCode(code);
    scopes = await getGrantedPermissions(userToken);
    const missing = REQUIRED_FACEBOOK_SCOPES.filter((s) => !scopes.includes(s));
    if (missing.length > 0) {
      return fail(
        "missing_permissions",
        `Linkee needs these Facebook permissions to post to your Pages: ${missing.join(", ")}. Connect again and keep them enabled.`,
      );
    }
    pages = await listPages(userToken);
  } catch (err) {
    console.warn(`[facebook] OAuth exchange failed for user ${user.id}: ${err instanceof Error ? err.message : err}`);
    return fail("facebook_error", `Couldn't connect Facebook: ${describeMetaError(err)}`);
  }

  if (pages.length === 0) {
    return fail(
      "no_pages",
      "No Facebook Pages were shared with Linkee. Connect again and select at least one Page you can create posts on.",
    );
  }

  const existing = await db.socialAccount.findMany({
    where: { provider: "FACEBOOK", providerAccountId: { in: pages.map((p) => p.id) } },
    select: { providerAccountId: true, userId: true },
  });
  const ownedElsewhere = new Set(existing.filter((e) => e.userId !== user.id).map((e) => e.providerAccountId));
  const alreadyMine = new Set(existing.filter((e) => e.userId === user.id).map((e) => e.providerAccountId));
  const connectable = pages.filter((p) => !ownedElsewhere.has(p.id));
  if (connectable.length === 0) {
    return fail("already_connected", "These Facebook Pages are already connected to another Linkee account.");
  }

  const newCount = connectable.filter((p) => !alreadyMine.has(p.id)).length;
  const currentCount = await db.socialAccount.count({ where: { userId: user.id } });
  const max = user.entitlements.maxSocialAccounts;
  if (currentCount + newCount > max) {
    return fail(
      "account_limit",
      `Your ${user.entitlements.label} plan allows ${max} connected accounts and you have ${currentCount}. Disconnect an account or share fewer Pages.`,
    );
  }

  await db.$transaction(
    connectable.map((page) => {
      const fields = {
        displayName: page.name,
        avatarUrl: page.pictureUrl,
        accountType: "PAGE",
        scopes,
        accessTokenEnc: encryptSecret(page.accessToken),
        // Page tokens obtained from a long-lived user token don't expire.
        tokenExpiresAt: null,
        tokenRefreshedAt: new Date(),
        status: "ACTIVE" as const,
        statusMessage: scopes.includes("publish_video")
          ? null
          : "Video permission wasn't granted. Reconnect and allow video publishing to post videos.",
      };
      return db.socialAccount.upsert({
        where: { provider_providerAccountId: { provider: "FACEBOOK", providerAccountId: page.id } },
        create: { userId: user.id, provider: "FACEBOOK", providerAccountId: page.id, ...fields },
        update: fields,
      });
    }),
  );

  return settingsRedirect({ connected: "facebook" });
}
