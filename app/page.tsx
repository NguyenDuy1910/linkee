import { ArrowRight, Comments, Link as LinkIcon, PaperPlane, Sparkles } from "@gravity-ui/icons";
import { buttonVariants } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { BioPageView, type BioViewPage } from "@/components/bio/bio-page-view";
import { PhoneFrame } from "@/components/bio/phone-frame";
import { LogoFacebook, LogoInstagram } from "@/components/icons/brand-icons";
import { Logo } from "@/components/layout/logo";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: { absolute: "Linkee — link in bio, AI comment replies, and post to all" },
  description:
    "Build a beautiful link-in-bio page in minutes, reply to Instagram comments with AI suggestions you approve, and publish once to Instagram and Facebook.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Linkee — link in bio, AI comment replies, and post to all",
    description: "One simple home for your links, your Instagram comments and your posts.",
    url: "/",
  },
};

/** Marketing illustration only — a fictional creator rendered with the real page renderer. */
const EXAMPLE_PAGE: BioViewPage = {
  displayName: "Maya Rivers",
  bio: "Ceramics, slow mornings & studio notes. New pieces every first Friday.",
  avatarUrl: null,
  theme: { preset: "sand", font: "serif", buttonShape: "pill", buttonFill: "solid" },
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com" },
    { platform: "youtube", url: "https://youtube.com" },
    { platform: "email", url: "mailto:hello@example.com" },
  ],
  links: [
    { id: "1", title: "Shop the spring collection", url: "#" },
    { id: "2", title: "Studio vlog: glazing day", url: "#" },
    { id: "3", title: "Join the newsletter", url: "#" },
    { id: "4", title: "Book a workshop", url: "#" },
  ],
};

const FEATURES = [
  {
    icon: LinkIcon,
    title: "A link in bio that looks like you",
    body: "Add links, social icons and a photo, pick a theme, and watch the live preview update as you type. Your page is fast, mobile-first and shows how many people tap each link.",
    points: ["Six polished themes, custom colors", "Click counts on every link", "Your own linkee.bio/username"],
  },
  {
    icon: Sparkles,
    title: "AI comment replies, you stay in control",
    body: "Instagram comments land in one inbox. Get an on-brand suggested reply, edit it, and send — nothing goes out without you. Pro users can turn on guarded auto-replies with skip keywords.",
    points: ["Suggest → edit → send", "Your tone and brand context", "Optional auto-reply with guardrails"],
  },
  {
    icon: PaperPlane,
    title: "Post to All",
    body: "Write a caption once, add photos or a video, and publish to your connected Instagram account and Facebook Pages in one go, with clear status for each.",
    points: ["Instagram and Facebook Pages today", "More platforms later", "Clear status for every account"],
  },
] as const;

const STEPS = [
  { title: "Claim your username", body: "Sign up with one short form. Your page is live instantly." },
  { title: "Make it yours", body: "Add links, pick a theme and connect Instagram or Facebook." },
  { title: "Share and grow", body: "Put your link in your bio, answer comments and post everywhere." },
] as const;

export default async function LandingPage() {
  const user = await getCurrentUser();
  const primary = user ? { href: "/dashboard", label: "Open dashboard" } : { href: "/signup", label: "Create your page" };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo href="/" />
          <nav aria-label="Account" className="flex items-center gap-2">
            {user ? null : (
              <NextLink href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Log in
              </NextLink>
            )}
            <NextLink href={primary.href} className={buttonVariants({ variant: "primary", size: "sm" })}>
              {primary.label}
            </NextLink>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pb-28">
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <LogoInstagram className="size-3.5" />
              <LogoFacebook className="size-3.5" />
              Built for Instagram and Facebook creators
            </p>
            <h1 className="mx-auto mt-6 max-w-xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:mx-0 lg:text-[56px]">
              Your link in bio, comments and posts — in one calm place.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted text-pretty sm:text-lg lg:mx-0">
              Linkee gives you a beautiful page for every link you share, AI-suggested replies to Instagram comments that you
              approve, and one button to post to Instagram and Facebook.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <NextLink href={primary.href} className={buttonVariants({ variant: "primary", size: "lg" })}>
                {primary.label}
                <ArrowRight className="size-4" aria-hidden />
              </NextLink>
              {user ? null : <span className="text-sm text-muted">Free to start · no credit card</span>}
            </div>
          </div>

          <div className="relative">
            <div aria-hidden className="absolute inset-x-8 top-10 bottom-10 -z-10 rounded-full bg-accent/10 blur-3xl" />
            <PhoneFrame label="Example Linkee page for a fictional creator" className="max-w-[290px]">
              <div inert className="h-full">
                <BioPageView page={EXAMPLE_PAGE} linkHref={() => null} className="min-h-full select-none" />
              </div>
            </PhoneFrame>
            <p className="mt-4 text-center text-xs text-muted">Example page</p>
          </div>
        </section>

        <section aria-labelledby="features-title" className="border-t border-border/60 bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="features-title" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Three tools that work together
              </h2>
              <p className="mt-4 text-muted text-pretty">
                Your page brings people in, your inbox keeps the conversation going, and Post to All keeps every channel fresh.
              </p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body, points }) => (
                <article key={title} className="flex flex-col rounded-2xl border border-border bg-surface p-6">
                  <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
                  <ul className="mt-5 flex flex-col gap-2 border-t border-border pt-5 text-sm">
                    {points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <h2 id="how-title" className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col items-center text-center md:items-start md:text-left">
                <span className="grid size-9 place-items-center rounded-full border border-border bg-surface text-sm font-semibold tabular-nums">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:pb-24">
          <div className="mx-auto flex max-w-4xl flex-col items-center rounded-3xl bg-foreground px-6 py-14 text-center text-background sm:px-12">
            <Comments className="size-6 opacity-70" aria-hidden />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Your page can be live in a minute.</h2>
            <p className="mt-3 max-w-md opacity-70">Pick a username, add a link, share it. Everything else can wait until you&apos;re ready.</p>
            <NextLink
              href={primary.href}
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-background px-6 text-sm font-semibold text-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
            >
              {primary.label}
              <ArrowRight className="size-4" aria-hidden />
            </NextLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <Logo href="/" />
          <p>© {new Date().getFullYear()} Linkee. Made for creators.</p>
          <nav aria-label="Footer" className="flex gap-4">
            <NextLink href="/login" className="hover:text-foreground">
              Log in
            </NextLink>
            <NextLink href="/signup" className="hover:text-foreground">
              Sign up
            </NextLink>
          </nav>
        </div>
      </footer>
    </div>
  );
}
