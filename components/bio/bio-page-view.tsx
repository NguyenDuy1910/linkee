import Image from "next/image";
import NextLink from "next/link";
import { SocialIcon } from "@/components/bio/social-icon";
import { initials, resolveTheme, socialPlatformLabel, type SocialLink, type Theme } from "@/lib/bio";

export interface BioViewLink {
  id: string;
  title: string;
  url: string;
}

export interface BioViewPage {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  theme: Theme;
  socialLinks: SocialLink[];
  links: BioViewLink[];
}

const LINK_BUTTON =
  "flex min-h-14 w-full items-center justify-center rounded-(--bio-radius) border-[1.5px] border-(--bio-btn-border) bg-(--bio-btn-bg) px-5 py-3.5 text-center text-[15px] font-medium text-(--bio-btn-text) outline-none transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--bio-text) motion-reduce:transition-none";

/**
 * Pure renderer for a bio page — used by the public page, the editor preview and the landing page.
 * `linkHref` lets the public page route clicks through /go/<id> while previews use the raw URL.
 */
export function BioPageView({
  page,
  linkHref,
  openInNewTab = false,
  className = "",
}: {
  page: BioViewPage;
  /** Return null to render an inert (non-link) button, e.g. a preview link without a valid URL yet. */
  linkHref: (link: BioViewLink) => string | null;
  /** Previews open links in a new tab so the editor never navigates away. */
  openInNewTab?: boolean;
  className?: string;
}) {
  const theme = resolveTheme(page.theme);
  const name = page.displayName.trim() || "Your name";
  const target = openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const style = {
    background: theme.background,
    color: theme.text,
    fontFamily: theme.fontFamily,
    "--bio-text": theme.text,
    "--bio-muted": theme.muted,
    "--bio-btn-bg": theme.button.background,
    "--bio-btn-text": theme.button.color,
    "--bio-btn-border": theme.button.border,
    "--bio-radius": theme.button.radius,
  } as React.CSSProperties;

  return (
    <div className={`flex w-full flex-col ${className}`} style={style}>
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center px-5 pt-12 pb-8">
        {page.avatarUrl ? (
          <Image
            src={page.avatarUrl}
            alt=""
            width={96}
            height={96}
            unoptimized
            className="size-24 rounded-full object-cover shadow-sm ring-1 ring-black/5"
          />
        ) : (
          <div
            aria-hidden
            className="grid size-24 place-items-center rounded-full text-2xl font-semibold"
            style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
          >
            {initials(name)}
          </div>
        )}

        <h1 className="mt-5 text-center text-xl leading-tight font-semibold tracking-tight break-words">{name}</h1>
        {page.bio.trim() ? (
          <p className="mt-2 max-w-sm text-center text-[15px] leading-relaxed whitespace-pre-line break-words text-(--bio-muted)">
            {page.bio}
          </p>
        ) : null}

        {page.socialLinks.length > 0 ? (
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-1" aria-label="Social profiles">
            {page.socialLinks.map((social) => (
              <li key={social.platform}>
                <a
                  href={social.url}
                  {...target}
                  aria-label={socialPlatformLabel(social.platform)}
                  className="grid size-10 place-items-center rounded-full outline-none transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--bio-text)"
                >
                  <SocialIcon platform={social.platform} className="size-5" />
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {page.links.length > 0 ? (
          <ul className="mt-8 flex w-full flex-col gap-3">
            {page.links.map((link) => {
              const href = linkHref(link);
              const content = <span className="break-words">{link.title}</span>;
              return (
                <li key={link.id}>
                  {href ? (
                    <a
                      href={href}
                      {...target}
                      className={`${LINK_BUTTON} hover:scale-[1.015] active:scale-[0.99] motion-reduce:hover:scale-100`}
                    >
                      {content}
                    </a>
                  ) : (
                    <div className={LINK_BUTTON}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        <footer className="mt-auto pt-14">
          <NextLink
            href="/"
            {...target}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-(--bio-muted) outline-none transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-(--bio-text)"
          >
            Made with Linkee
          </NextLink>
        </footer>
      </div>
    </div>
  );
}
