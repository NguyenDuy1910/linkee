import { buttonVariants } from "@heroui/react";
import NextLink from "next/link";
import { Logo } from "@/components/layout/logo";

export default function BioNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <Logo href="/" />
      <h1 className="mt-10 text-2xl font-semibold tracking-tight">This page doesn&apos;t exist yet</h1>
      <p className="mt-2 max-w-sm text-[15px] text-muted">
        The link may be mistyped, or the page was unpublished. Good news: this username might be free.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <NextLink href="/signup" className={buttonVariants({ variant: "primary" })}>
          Create your page
        </NextLink>
        <NextLink href="/" className={buttonVariants({ variant: "ghost" })}>
          Learn about Linkee
        </NextLink>
      </div>
    </main>
  );
}
