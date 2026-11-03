import { NextResponse } from "next/server";
import { signNotice, signState } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env, isInstagramConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { instagramAuthorizeUrl } from "@/lib/social/instagram";

/** Starts "Instagram API with Instagram Login" OAuth for the signed-in user. */
export async function GET() {
  const base = env().APP_URL;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", base));
  if (!isInstagramConfigured()) {
    return NextResponse.redirect(new URL("/dashboard/settings?error=instagram_not_configured", base));
  }

  const accounts = await db.socialAccount.findMany({
    where: { userId: user.id },
    select: { provider: true },
  });
  // Could be a reconnect of an existing Instagram account; the callback enforces the exact limit.
  const mayBeReconnect = accounts.some((a) => a.provider === "INSTAGRAM");
  if (!mayBeReconnect && accounts.length >= user.entitlements.maxSocialAccounts) {
    const message = `Your ${user.entitlements.label} plan allows ${user.entitlements.maxSocialAccounts} connected accounts. Disconnect one to add another.`;
    const url = new URL("/dashboard/settings", base);
    url.searchParams.set("error", "account_limit");
    url.searchParams.set("message", message);
    url.searchParams.set("sig", signNotice(message));
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(instagramAuthorizeUrl(signState({ userId: user.id, provider: "instagram" })));
}
