import NextLink from "next/link";
import { Logo } from "@/components/layout/logo";

/** Centered auth screen: logo, card with title + form, and a switch link (log in ↔ sign up). */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: { text: string; href: string; label: string };
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-background px-4 py-10 sm:justify-center">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Logo href="/" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          {footer.text}{" "}
          <NextLink
            href={footer.href}
            className="rounded font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
          >
            {footer.label}
          </NextLink>
        </p>
      </div>
    </main>
  );
}
