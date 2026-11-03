import { PaperPlane, PlugConnection } from "@gravity-ui/icons";
import { Alert, buttonVariants } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { UpgradeNotice } from "@/components/layout/upgrade-notice";
import { Composer } from "@/components/publishing/composer";
import { PostHistory } from "@/components/publishing/post-history";
import { isPublicHttpsAppUrl } from "@/lib/env";
import { isWorkerHealthy } from "@/lib/jobs";
import { getDraft, listPublishAccounts, listRecentPosts } from "@/lib/publishing";
import { PUBLIC_MEDIA_URL_MESSAGE } from "@/lib/publishing-rules";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Publish" };

export default async function PublishPage({ searchParams }: PageProps<"/dashboard/publish">) {
  const user = await requireUser();
  const { edit } = await searchParams;
  const editId = typeof edit === "string" ? edit : undefined;
  const canPublish = user.entitlements.publishing;

  const [accounts, posts, workerHealthy, draft] = await Promise.all([
    listPublishAccounts(user.id),
    listRecentPosts(user.id),
    isWorkerHealthy(),
    canPublish && editId ? getDraft(user.id, editId) : null,
  ]);
  const mediaPublishingAvailable = isPublicHttpsAppUrl();

  return (
    <>
      <PageHeader
        title="Publish"
        description="Write once and post to your Instagram accounts and Facebook Pages in one go."
      />

      <div className="flex flex-col gap-8">
        {!canPublish ? (
          <div className="flex flex-col gap-4">
            <UpgradeNotice title="Post to All is a Pro feature" />
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-default text-muted">
                  <PaperPlane className="size-5" aria-hidden />
                </div>
                <div className="text-sm">
                  <h2 className="font-medium">What you get with Post to All</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-muted">
                    <li>One caption and media set, published to every connected Instagram account and Facebook Page.</li>
                    <li>Checks for each network&apos;s limits before anything is posted.</li>
                    <li>Live status per destination, with one-click retry for anything that fails.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={<PlugConnection />}
            title="Connect an account to start publishing"
            description="Connect an Instagram professional account or a Facebook Page in Settings, then come back to post to all of them at once."
            action={
              <NextLink href="/dashboard/settings#accounts" className={buttonVariants({ variant: "primary" })}>
                Go to Settings
              </NextLink>
            }
          />
        ) : (
          <>
            {!workerHealthy ? (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Publishing is paused — the background worker is not running</Alert.Title>
                  <Alert.Description>
                    You can still submit posts. They stay Pending and publish as soon as the worker starts.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
            {!mediaPublishingAvailable ? (
              <Alert status="default">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Photo and video posts are unavailable on this address</Alert.Title>
                  <Alert.Description>
                    {PUBLIC_MEDIA_URL_MESSAGE} Text-only Facebook posts still work.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
            <Composer
              key={draft?.id ?? "new"}
              accounts={accounts}
              draft={draft}
              mediaPublishingAvailable={mediaPublishingAvailable}
            />
          </>
        )}

        {canPublish || posts.length > 0 ? <PostHistory posts={posts} canPublish={canPublish} /> : null}
      </div>
    </>
  );
}
