import NextLink from "next/link";

export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <NextLink
      href={href}
      className="inline-flex items-center gap-2 rounded-md text-[17px] font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-focus"
      aria-label="Linkee home"
    >
      <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
        L
      </span>
      Linkee
    </NextLink>
  );
}
