import type { Plan } from "@/lib/generated/prisma/client";

export type Entitlements = {
  label: string;
  /** AI reply suggestions + auto-replies */
  ai: boolean;
  /** Post to All */
  publishing: boolean;
  aiSuggestionsPerDay: number;
  autoRepliesPerDay: number;
  /** Shared per-minute ceiling for all OpenRouter calls of a user */
  aiCallsPerMinute: number;
  maxSocialAccounts: number;
};

export const PLANS: Record<Plan, Entitlements> = {
  FREE: {
    label: "Free",
    ai: false,
    publishing: false,
    aiSuggestionsPerDay: 0,
    autoRepliesPerDay: 0,
    aiCallsPerMinute: 0,
    maxSocialAccounts: 3,
  },
  PRO: {
    label: "Pro",
    ai: true,
    publishing: true,
    aiSuggestionsPerDay: 200,
    autoRepliesPerDay: 100,
    aiCallsPerMinute: 10,
    maxSocialAccounts: 10,
  },
};

export function entitlements(plan: Plan): Entitlements {
  return PLANS[plan];
}

/** Shown wherever a FREE user hits a PRO feature. No payment gateway exists yet. */
export const UPGRADE_MESSAGE =
  "AI replies and Post to All are included in Linkee Pro. Contact us to upgrade your account.";
