"use client";

import { ArrowRightFromSquare, ArrowUpRightFromSquare, Comments, Gear, House, Person, PaperPlane } from "@gravity-ui/icons";
import { Avatar, Chip, Dropdown, Label, Separator } from "@heroui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/dashboard/actions";
import { Logo } from "@/components/layout/logo";

const NAV = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/my-page", label: "My Page", icon: Person },
  { href: "/dashboard/publish", label: "Publish", icon: PaperPlane },
  { href: "/dashboard/inbox", label: "Inbox", icon: Comments },
  { href: "/dashboard/settings", label: "Settings", icon: Gear },
] as const;

interface ShellUser {
  email: string;
  name: string | null;
  planLabel: string;
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function AppShell({ user, slug, children }: { user: ShellUser; slug: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface px-3 py-5 md:flex">
        <div className="px-3 pb-6">
          <Logo />
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <NextLink
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                  active ? "bg-default text-foreground" : "text-muted hover:bg-default/60 hover:text-foreground"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </NextLink>
            );
          })}
        </nav>
        {slug && (
          <a
            href={`/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="mx-1 mb-3 flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span className="truncate">linkee.bio/{slug}</span>
            <ArrowUpRightFromSquare className="size-3.5 shrink-0" aria-hidden />
          </a>
        )}
        <UserMenu user={user} initials={initials} slug={slug} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur md:hidden">
        <Logo />
        <UserMenu user={user} initials={initials} slug={slug} compact />
      </header>

      <main className="pb-24 md:pb-10 md:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-10 lg:px-10">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <NextLink
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium outline-none focus-visible:bg-default ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NextLink>
          );
        })}
      </nav>
    </div>
  );
}

function UserMenu({
  user,
  initials,
  slug,
  compact,
}: {
  user: ShellUser;
  initials: string;
  slug: string | null;
  compact?: boolean;
}) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="Account menu"
        className={`flex items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          compact ? "rounded-full" : "w-full px-2 py-2 hover:bg-default/60"
        }`}
      >
        <Avatar size="sm">
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name || user.email}</span>
            <span className="block truncate text-xs text-muted">{user.email}</span>
          </span>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover placement={compact ? "bottom end" : "top start"}>
        <div className="flex items-center justify-between gap-3 px-3 pt-3 pb-2">
          <span className="truncate text-sm font-medium">{user.email}</span>
          <Chip size="sm" variant="soft" color={user.planLabel === "Pro" ? "accent" : "default"}>
            {user.planLabel}
          </Chip>
        </div>
        <Separator />
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "view" && slug) window.open(`/${slug}`, "_blank", "noopener");
            if (key === "signout") void signOutAction();
          }}
        >
          {slug ? (
            <Dropdown.Item id="view" textValue="View my page">
              <ArrowUpRightFromSquare className="size-4 text-muted" aria-hidden />
              <Label>View my page</Label>
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item id="signout" textValue="Sign out" variant="danger">
            <ArrowRightFromSquare className="size-4 text-danger" aria-hidden />
            <Label>Sign out</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
