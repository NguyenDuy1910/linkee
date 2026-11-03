import { NextResponse } from "next/server";
import { signState } from "@/lib/crypto";
import { env, isFacebookConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { facebookAuthorizeUrl } from "@/lib/social/facebook";

/**
 * Starts Facebook Login for Pages for the signed-in user. The plan's account limit is
 * enforced in the callback, once we know which Pages were shared (some may be reconnects).
 */
export async function GET() {
  const base = env().APP_URL;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", base));
  if (!isFacebookConfigured()) {
    return NextResponse.redirect(new URL("/dashboard/settings?error=facebook_not_configured", base));
  }
  return NextResponse.redirect(facebookAuthorizeUrl(signState({ userId: user.id, provider: "facebook" })));
}
