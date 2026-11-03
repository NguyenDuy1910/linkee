import { Alert, Button, buttonVariants, Card, Chip, Label, Meter } from "@heroui/react";
import type { Metadata } from "next";
import { AiPreferencesForm } from "@/app/dashboard/settings/ai-preferences-form";
import { LogoFacebook, LogoInstagram } from "@/components/icons/brand-icons";
import { UpgradeNotice } from "@/components/layout/upgrade-notice";
import { PageHeader } from "@/components/layout/page-header";
import { ConnectedAccountList, type ConnectedAccountView } from "@/components/social/connected-accounts";
import { autoReplyBlockers } from "@/lib/ai/auto-reply";
import { getAiSettings, startOfUtcDay } from "@/lib/ai/replies";
import { verifyNotice } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env, isFacebookConfigured, isInstagramConfigured, isOpenRouterConfigured } from "@/lib/env";
import { isWorkerHealthy } from "@/lib/jobs";
import { requireUser } from "@/lib/session";
import { PROFESSIONAL_ACCOUNT_HELP_URL } from "@/lib/social/instagram";

export const metadata: Metadata = { title: "Settings" };

const ERROR_MESSAGES: Record<string, string> = {
  instagram_not_configured: "Instagram isn't configured on this server. Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET, then try again.",
  facebook_not_configured: "Facebook isn't configured on this server. Set META_APP_ID and META_APP_SECRET, then try again.",
};

const CONNECTED_MESSAGES: Record<string, string> = {
  instagram: "Instagram connected. Head to the Inbox and press Refresh to pull your latest comments.",
  facebook: "Facebook Page connected. You can now include it when you Post to All.",
};

const ACCOUNT_TYPE_LABEL: Record<string, string> = { BUSINESS: "Business", MEDIA_CREATOR: "Creator", PAGE: "Page" };

function single(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 });
const int = new Intl.NumberFormat("en-US");
const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export default async function SettingsPage({ searchParams }: PageProps<"/dashboard/settings">) {
  const user = await requireUser();
  const sp = await searchParams;
  const connected = single(sp.connected);
  const errorCode = single(sp.error);
  // Only messages signed by our OAuth routes are shown; arbitrary `?message=` text is ignored.
  const rawMessage = single(sp.message)?.slice(0, 500);
  const errorMessage = verifyNotice(rawMessage, single(sp.sig)) ? rawMessage : undefined;

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86_400_000);
  const [accounts, workerHealthy, aiSettings, today, month] = await Promise.all([
    db.socialAccount.findMany({
      where: { userId: user.id },
      // Enum order: INSTAGRAM before FACEBOOK.
      orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        provider: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        accountType: true,
        status: true,
        statusMessage: true,
        tokenExpiresAt: true,
        webhooksSubscribed: true,
        autoReplyEnabled: true,
      },
    }),
    isWorkerHealthy(),
    getAiSettings(user.id),
    db.aiUsage.groupBy({
      by: ["purpose"],
      where: { userId: user.id, success: true, createdAt: { gte: startOfUtcDay() } },
      _count: { _all: true },
    }),
    db.aiUsage.aggregate({
      where: { userId: user.id, createdAt: { gte: since30 } },
      _sum: { promptTokens: true, completionTokens: true, costUsd: true },
      _count: { _all: true },
    }),
  ]);

  const views: ConnectedAccountView[] = accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    name: a.displayName,
    handle: a.username ? `@${a.username}` : null,
    avatarUrl: a.avatarUrl,
    typeLabel: a.accountType ? (ACCOUNT_TYPE_LABEL[a.accountType] ?? a.accountType) : null,
    status: a.status,
    statusMessage: a.statusMessage,
    tokenExpiryLabel: a.tokenExpiresAt
      ? `${a.tokenExpiresAt < now ? "Access expired" : "Access valid until"} ${day.format(a.tokenExpiresAt)}`
      : null,
    webhooksSubscribed: a.webhooksSubscribed,
    autoReplyEnabled: a.autoReplyEnabled,
    autoReplyBlockers: a.provider === "INSTAGRAM" ? autoReplyBlockers(a, user, workerHealthy) : [],
  }));

  const igConfigured = isInstagramConfigured();
  const fbConfigured = isFacebookConfigured();
  const aiConfigured = isOpenRouterConfigured();
  const ent = user.entitlements;
  const usedSuggestions = today.find((t) => t.purpose === "SUGGESTION")?._count._all ?? 0;
  const usedAutoReplies = today.find((t) => t.purpose === "AUTO_REPLY")?._count._all ?? 0;
  const tokens = (month._sum.promptTokens ?? 0) + (month._sum.completionTokens ?? 0);
  const cost = month._sum.costUsd ? Number(month._sum.costUsd) : 0;

  const feedback = connected && CONNECTED_MESSAGES[connected]
    ? { status: "success" as const, title: CONNECTED_MESSAGES[connected] }
    : errorCode
      ? { status: "danger" as const, title: errorMessage || ERROR_MESSAGES[errorCode] || "Something went wrong while connecting. Please try again." }
      : null;

  return (
    <>
      <PageHeader title="Settings" description="Connected accounts, AI reply preferences, and your plan." />

      <div className="flex flex-col gap-6">
        {feedback ? (
          <Alert status={feedback.status} role={feedback.status === "danger" ? "alert" : "status"}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{feedback.title}</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}

        <section id="accounts" aria-labelledby="accounts-title" className="scroll-mt-24">
          <Card className="rounded-2xl p-5 sm:p-6">
            <Card.Header>
              <Card.Title id="accounts-title">Connected accounts</Card.Title>
              <Card.Description>
                Instagram powers your comment Inbox and posting; Facebook Pages can be included when you Post to All.
              </Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-5">
              {views.length > 0 ? (
                <ConnectedAccountList accounts={views} />
              ) : (
                <p className="text-sm text-muted">No accounts connected yet.</p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <ConnectOption
                  configured={igConfigured}
                  href="/api/social/instagram/connect"
                  icon={<LogoInstagram className="size-4" />}
                  label="Connect Instagram"
                  hint={
                    igConfigured ? (
                      <>
                        Professional accounts (Creator or Business) only.{" "}
                        <a href={PROFESSIONAL_ACCOUNT_HELP_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          Switch a personal account
                        </a>
                      </>
                    ) : (
                      "Not configured on this server: set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET."
                    )
                  }
                />
                <ConnectOption
                  configured={fbConfigured}
                  href="/api/social/facebook/connect"
                  icon={<LogoFacebook className="size-4" />}
                  label="Connect Facebook Page"
                  hint={
                    fbConfigured
                      ? "Choose the Pages you manage. Each Page appears as its own account."
                      : "Not configured on this server: set META_APP_ID and META_APP_SECRET."
                  }
                />
              </div>

              <p className="text-xs leading-relaxed text-muted">
                Until Meta approves this app (App Review with Advanced Access plus Business Verification), only Instagram
                and Facebook accounts added as testers on the Meta app can connect.
              </p>
            </Card.Content>
          </Card>
        </section>

        <section id="ai" aria-labelledby="ai-title" className="scroll-mt-24">
          <Card className="rounded-2xl p-5 sm:p-6">
            <Card.Header>
              <Card.Title id="ai-title">AI reply preferences</Card.Title>
              <Card.Description>How suggested replies and auto-replies sound. Changes apply to new suggestions.</Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-5">
              {ent.ai ? (
                <>
                  {aiConfigured ? null : (
                    <Alert status="warning">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>AI isn&apos;t configured on this server</Alert.Title>
                        <Alert.Description>Set OPENROUTER_API_KEY to enable suggestions and auto-replies.</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                  <AiPreferencesForm
                    initial={{
                      tone: aiSettings.tone,
                      language: aiSettings.language,
                      brandContext: aiSettings.brandContext,
                      skipKeywords: aiSettings.skipKeywords,
                    }}
                  />
                </>
              ) : (
                <p className="text-sm text-muted">
                  AI suggestions and auto-replies are part of Linkee Pro.{" "}
                  <a href="#plan" className="font-medium text-foreground underline underline-offset-2">
                    See your plan
                  </a>
                </p>
              )}
            </Card.Content>
          </Card>
        </section>

        <section id="plan" aria-labelledby="plan-title" className="scroll-mt-24">
          <Card className="rounded-2xl p-5 sm:p-6">
            <Card.Header>
              <div className="flex items-center gap-3">
                <Card.Title id="plan-title">Plan &amp; usage</Card.Title>
                <Chip size="sm" variant="soft" color={ent.ai ? "accent" : "default"}>
                  {ent.label}
                </Chip>
              </div>
              <Card.Description>
                Up to {ent.maxSocialAccounts} connected accounts. Daily AI limits reset at midnight UTC.
              </Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-5">
              {ent.ai ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <UsageMeter label="AI suggestions today" used={usedSuggestions} limit={ent.aiSuggestionsPerDay} />
                    <UsageMeter label="Auto-replies today" used={usedAutoReplies} limit={ent.autoRepliesPerDay} />
                  </div>
                  <dl className="grid gap-4 text-sm sm:grid-cols-3">
                    <Stat label="AI requests (30 days)" value={int.format(month._count._all)} />
                    <Stat label="Tokens (30 days)" value={int.format(tokens)} />
                    <Stat label="AI cost (30 days)" value={usd.format(cost)} />
                  </dl>
                  <p className="text-xs text-muted">
                    Model: <span className="font-mono">{aiConfigured ? env().OPENROUTER_MODEL : "not configured"}</span>
                  </p>
                </>
              ) : (
                <UpgradeNotice />
              )}
            </Card.Content>
          </Card>
        </section>

        <section id="account" aria-labelledby="account-title" className="scroll-mt-24">
          <Card className="rounded-2xl p-5 sm:p-6">
            <Card.Header>
              <Card.Title id="account-title">Account</Card.Title>
            </Card.Header>
            <Card.Content>
              <dl className="text-sm">
                <dt className="text-muted">Email</dt>
                <dd className="mt-0.5 font-medium">{user.email}</dd>
              </dl>
            </Card.Content>
          </Card>
        </section>
      </div>
    </>
  );
}

function ConnectOption({
  configured,
  href,
  icon,
  label,
  hint,
}: {
  configured: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      {configured ? (
        <a href={href} className={buttonVariants({ variant: "secondary" })}>
          {icon}
          {label}
        </a>
      ) : (
        <Button variant="secondary" isDisabled>
          {icon}
          {label}
        </Button>
      )}
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const ratio = limit > 0 ? used / limit : 1;
  return (
    <Meter
      value={Math.min(used, limit)}
      maxValue={Math.max(limit, 1)}
      valueLabel={`${int.format(used)} / ${int.format(limit)}`}
      color={ratio >= 1 ? "danger" : ratio >= 0.8 ? "warning" : "accent"}
      className="w-full"
    >
      <Label>{label}</Label>
      <Meter.Output />
      <Meter.Track>
        <Meter.Fill />
      </Meter.Track>
    </Meter>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-default/50 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
