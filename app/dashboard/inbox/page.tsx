import { Comments } from "@gravity-ui/icons";
import { Alert, buttonVariants } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { CommentCard, type AiAvailability, type InboxCommentView } from "@/components/comments/comment-card";
import { absoluteTime, relativeTime } from "@/components/comments/format";
import { AccountSwitcher, RefreshButton } from "@/components/comments/inbox-toolbar";
import { LogoInstagram } from "@/components/icons/brand-icons";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/lib/db";
import { env, isInstagramConfigured, isOpenRouterConfigured } from "@/lib/env";
import type { CommentStatus } from "@/lib/generated/prisma/client";
import { requireUser } from "@/lib/session";
import { PROFESSIONAL_ACCOUNT_HELP_URL } from "@/lib/social/instagram";

export const metadata: Metadata = { title: "Inbox" };

const PAGE_SIZE = 25;
const MAX_LIMIT = 500;
/** OAuth start route: a full-page navigation (plain <a>), never a client-side Link. */
const IG_CONNECT_URL = "/api/social/instagram/connect";

const TABS = [
  { key: "new", label: "New", status: "NEW" },
  { key: "replied", label: "Replied", status: "REPLIED" },
  { key: "skipped", label: "Skipped", status: "SKIPPED" },
  { key: "all", label: "All", status: null },
] as const satisfies ReadonlyArray<{ key: string; label: string; status: CommentStatus | null }>;

type TabKey = (typeof TABS)[number]["key"];

function single(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function InboxPage({ searchParams }: PageProps<"/dashboard/inbox">) {
  const user = await requireUser();
  const sp = await searchParams;

  const accounts = await db.socialAccount.findMany({
    where: { userId: user.id, provider: "INSTAGRAM" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      status: true,
      statusMessage: true,
      webhooksSubscribed: true,
      lastSyncedAt: true,
    },
  });

  if (accounts.length === 0) {
    const configured = isInstagramConfigured();
    return (
      <>
        <PageHeader title="Inbox" description="Every comment on your Instagram posts, in one calm place." />
        <EmptyState
          icon={<LogoInstagram />}
          title="Connect Instagram to see your comments"
          description={
            <>
              Works with Instagram Professional accounts (Creator or Business).{" "}
              <a href={PROFESSIONAL_ACCOUNT_HELP_URL} target="_blank" rel="noreferrer" className="font-medium text-foreground underline underline-offset-2">
                How to switch a personal account
              </a>
              .
              {configured ? null : " Instagram isn't configured on this server yet (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET)."}
            </>
          }
          action={
            configured ? (
              <a href={IG_CONNECT_URL} className={buttonVariants({ variant: "primary" })}>
                <LogoInstagram className="size-4" />
                Connect Instagram
              </a>
            ) : (
              <NextLink href="/dashboard/settings#accounts" className={buttonVariants({ variant: "secondary" })}>
                Open Settings
              </NextLink>
            )
          }
        />
      </>
    );
  }

  const account = accounts.find((a) => a.id === single(sp.account)) ?? accounts[0];
  const tabKey: TabKey = TABS.some((t) => t.key === single(sp.status)) ? (single(sp.status) as TabKey) : "new";
  const tab = TABS.find((t) => t.key === tabKey)!;
  const limitParam = Number.parseInt(single(sp.limit) ?? "", 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, PAGE_SIZE), MAX_LIMIT) : PAGE_SIZE;

  const [grouped, rows] = await Promise.all([
    db.instagramComment.groupBy({ by: ["status"], where: { socialAccountId: account.id }, _count: { _all: true } }),
    db.instagramComment.findMany({
      where: { socialAccountId: account.id, ...(tab.status ? { status: tab.status } : {}) },
      orderBy: { commentedAt: "desc" },
      take: limit + 1,
      select: {
        id: true,
        authorUsername: true,
        text: true,
        commentedAt: true,
        status: true,
        mediaCaption: true,
        mediaPermalink: true,
        mediaThumbnailUrl: true,
        replies: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { text: true, source: true, status: true, sentAt: true, error: true },
        },
      },
    }),
  ]);

  const counts: Record<TabKey, number> = { new: 0, replied: 0, skipped: 0, all: 0 };
  for (const g of grouped) {
    counts[g.status.toLowerCase() as TabKey] = g._count._all;
    counts.all += g._count._all;
  }

  const now = new Date();
  const hasMore = rows.length > limit;
  const comments: InboxCommentView[] = rows.slice(0, limit).map((c) => {
    const sent = c.replies.find((r) => r.status === "SENT");
    const draft = c.replies.find((r) => r.status === "DRAFT" && r.source === "AI");
    const latest = c.replies[0];
    return {
      id: c.id,
      authorUsername: c.authorUsername,
      text: c.text,
      timeLabel: relativeTime(c.commentedAt, now),
      timeTitle: absoluteTime(c.commentedAt),
      status: c.status,
      media: { caption: c.mediaCaption, permalink: c.mediaPermalink, thumbnailUrl: c.mediaThumbnailUrl },
      sentReply: sent ? { text: sent.text, source: sent.source, timeLabel: relativeTime(sent.sentAt ?? now, now) } : null,
      draft: draft?.text ?? null,
      lastError: c.status !== "REPLIED" && latest?.status === "FAILED" ? `Last attempt failed: ${latest.error ?? "unknown error"}` : null,
    };
  });

  const ai: AiAvailability = !user.entitlements.ai ? "upgrade" : isOpenRouterConfigured() ? "ready" : "not_configured";
  const canReply = account.status === "ACTIVE";
  const label = (a: (typeof accounts)[number]) => (a.username ? `@${a.username}` : a.displayName);
  const href = (params: { status?: TabKey; limit?: number }) => {
    const q = new URLSearchParams({ account: account.id, status: params.status ?? tabKey });
    if (params.limit) q.set("limit", String(params.limit));
    return `/dashboard/inbox?${q.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Inbox"
        description={
          <>
            Comments on your latest posts for <span className="font-medium text-foreground">{label(account)}</span>
            {" · "}
            {account.lastSyncedAt ? (
              <time title={absoluteTime(account.lastSyncedAt)}>Synced {relativeTime(account.lastSyncedAt, now)}</time>
            ) : (
              "Not synced yet"
            )}
          </>
        }
        actions={
          <>
            {accounts.length > 1 ? (
              <AccountSwitcher accounts={accounts.map((a) => ({ id: a.id, label: label(a) }))} selectedId={account.id} status={tabKey} />
            ) : null}
            {canReply ? <RefreshButton accountId={account.id} /> : null}
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {account.status === "NEEDS_RECONNECT" ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Reconnect {label(account)} to keep replying</Alert.Title>
              <Alert.Description>
                {account.statusMessage ?? "Instagram stopped accepting this connection."}{" "}
                <a href={IG_CONNECT_URL} className="font-medium underline underline-offset-2">
                  Reconnect
                </a>
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : account.statusMessage ? (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Limited access</Alert.Title>
              <Alert.Description>
                {account.statusMessage}{" "}
                <a href={IG_CONNECT_URL} className="font-medium underline underline-offset-2">
                  Reconnect
                </a>
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : !account.webhooksSubscribed ? (
          <p className="text-sm text-muted">Real-time updates unavailable — use Refresh to pull new comments.</p>
        ) : null}

        <nav aria-label="Filter comments" className="flex gap-1 overflow-x-auto rounded-xl bg-default/60 p-1 sm:w-fit">
          {TABS.map((t) => {
            const active = t.key === tabKey;
            return (
              <NextLink
                key={t.key}
                href={href({ status: t.key })}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                  active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
                <span className="text-xs tabular-nums text-muted">{counts[t.key]}</span>
              </NextLink>
            );
          })}
        </nav>

        {comments.length === 0 ? (
          counts.all === 0 && !account.lastSyncedAt ? (
            <EmptyState
              icon={<Comments />}
              title="Pull in your latest comments"
              description="Linkee reads comments on your 10 most recent posts. Refresh any time to check for new ones."
              action={canReply ? <RefreshButton accountId={account.id} /> : undefined}
            />
          ) : (
            <EmptyState
              icon={<Comments />}
              title={tabKey === "new" ? "You're all caught up" : `No ${tab.label.toLowerCase()} comments`}
              description={
                tabKey === "new"
                  ? "New comments on your recent posts will show up here."
                  : "Comments you handle will be listed here."
              }
            />
          )
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <li key={c.id}>
                <CommentCard comment={c} ai={ai} canReply={canReply} upgradeUrl={env().UPGRADE_URL ?? null} />
              </li>
            ))}
          </ul>
        )}

        {hasMore ? (
          <div className="flex justify-center pt-2">
            <NextLink href={href({ limit: limit + PAGE_SIZE })} scroll={false} className={buttonVariants({ variant: "secondary" })}>
              Load more
            </NextLink>
          </div>
        ) : null}
      </div>
    </>
  );
}
