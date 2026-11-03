import { ArrowRight, ArrowUpRightFromSquare, CircleCheckFill, Circle } from "@gravity-ui/icons";
import { buttonVariants } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { loadEditorData } from "@/app/dashboard/my-page/data";
import { CopyLinkButton } from "@/components/bio/copy-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardHome() {
  const user = await requireUser();
  const [page, clicks, activeLinks, totalLinks, newComments, publishedPosts, instagramAccounts] = await Promise.all([
    loadEditorData(user.id),
    db.bioLink.aggregate({ where: { page: { userId: user.id } }, _sum: { clicks: true } }),
    db.bioLink.count({ where: { page: { userId: user.id }, isActive: true } }),
    db.bioLink.count({ where: { page: { userId: user.id } } }),
    db.instagramComment.count({ where: { status: "NEW", socialAccount: { userId: user.id } } }),
    db.postTarget.count({ where: { status: "PUBLISHED", post: { userId: user.id } } }),
    db.socialAccount.count({ where: { userId: user.id, provider: "INSTAGRAM" } }),
  ]);

  const firstName = (user.name ?? "").trim().split(/\s+/)[0];
  const publicUrl = `${env().APP_URL}/${page.slug}`;

  const steps = [
    { title: "Create your page", description: `linkee.bio/${page.slug} is yours.`, done: true, href: "/dashboard/my-page", cta: "Edit page" },
    {
      title: "Add your first link",
      description: "Point visitors to your shop, latest video or newsletter.",
      done: totalLinks > 0,
      href: "/dashboard/my-page",
      cta: "Add a link",
    },
    {
      title: "Connect Instagram",
      description: "Bring your comments into one inbox and reply faster.",
      done: instagramAccounts > 0,
      href: "/dashboard/settings",
      cta: "Connect",
    },
    {
      title: "Publish your first post",
      description: "Write once and post to Instagram and Facebook together.",
      done: publishedPosts > 0,
      href: "/dashboard/publish",
      cta: "Create a post",
    },
  ];
  const nextStep = steps.find((s) => !s.done);
  const completed = steps.filter((s) => s.done).length;

  const stats = [
    { label: "Link clicks", value: clicks._sum.clicks ?? 0, href: "/dashboard/my-page" },
    { label: "Active links", value: activeLinks, href: "/dashboard/my-page" },
    { label: "Comments to reply", value: newComments, href: "/dashboard/inbox" },
    { label: "Posts published", value: publishedPosts, href: "/dashboard/publish" },
  ];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description="Here's how your page is doing and what to do next."
        actions={
          nextStep ? (
            <NextLink href={nextStep.href} className={buttonVariants({ variant: "primary" })}>
              {nextStep.title}
              <ArrowRight className="size-4" aria-hidden />
            </NextLink>
          ) : (
            <NextLink href="/dashboard/my-page" className={buttonVariants({ variant: "primary" })}>
              Edit my page
            </NextLink>
          )
        }
      />

      <div className="flex flex-col gap-6">
        <section
          aria-label="Your page"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="min-w-0">
            <p className="text-sm text-muted">{page.published ? "Your page is live" : "Your page is unpublished"}</p>
            <p className="mt-1 truncate text-lg font-semibold tracking-tight">linkee.bio/{page.slug}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyLinkButton url={publicUrl} />
            {page.published ? (
              <a href={`/${page.slug}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "tertiary" })}>
                <ArrowUpRightFromSquare className="size-4" aria-hidden />
                View page
              </a>
            ) : (
              <NextLink href="/dashboard/my-page" className={buttonVariants({ variant: "tertiary" })}>
                Publish page
              </NextLink>
            )}
          </div>
        </section>

        <section aria-label="Stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <NextLink
              key={stat.label}
              href={stat.href}
              className="rounded-2xl border border-border bg-surface p-5 outline-none transition-colors hover:border-muted/40 focus-visible:ring-2 focus-visible:ring-focus"
            >
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{stat.value.toLocaleString("en-US")}</p>
            </NextLink>
          ))}
        </section>

        <section aria-labelledby="setup-title" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="setup-title" className="text-base font-semibold">
                {nextStep ? "Get set up" : "You're all set"}
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {completed} of {steps.length} done
              </p>
            </div>
            <div
              role="progressbar"
              aria-label="Setup progress"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={completed}
              className="h-1.5 w-28 overflow-hidden rounded-full bg-default"
            >
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(completed / steps.length) * 100}%` }} />
            </div>
          </div>
          <ol className="mt-5 divide-y divide-border">
            {steps.map((step) => {
              const isNext = step === nextStep;
              return (
                <li key={step.title} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  {step.done ? (
                    <CircleCheckFill className="size-5 shrink-0 text-success" aria-label="Done" role="img" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted" aria-label="Not done" role="img" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${step.done ? "text-muted line-through decoration-muted/40" : ""}`}>{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{step.description}</p>
                  </div>
                  {!step.done ? (
                    <NextLink href={step.href} className={buttonVariants({ variant: isNext ? "primary" : "ghost", size: "sm" })}>
                      {step.cta}
                    </NextLink>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}
