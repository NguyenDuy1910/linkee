"use client";

import { ArrowShapeTurnUpRight, Bookmark, Comment, Heart, PaperPlane, Picture, ThumbsUp } from "@gravity-ui/icons";
import { Avatar } from "@heroui/react";
import type { PublishAccountDTO } from "@/lib/publishing";
import { INSTAGRAM_LIMITS } from "@/lib/publishing-rules";
import { ProviderIcon } from "./provider-icon";

export interface PreviewMedia {
  key: string;
  kind: "IMAGE" | "VIDEO";
  src: string;
  width: number | null;
  height: number | null;
}

function MediaView({ item, className }: { item: PreviewMedia; className: string }) {
  return item.kind === "IMAGE" ? (
    // eslint-disable-next-line @next/next/no-img-element -- local blob/uploaded previews
    <img src={item.src} alt="" className={className} />
  ) : (
    <video src={item.src} muted playsInline preload="metadata" className={className} />
  );
}

function AccountAvatar({ account }: { account: PublishAccountDTO }) {
  return (
    <Avatar size="sm">
      {account.avatarUrl ? <Avatar.Image alt="" src={account.avatarUrl} /> : null}
      <Avatar.Fallback>{account.name.replace(/^@/, "").slice(0, 2).toUpperCase()}</Avatar.Fallback>
    </Avatar>
  );
}

function InstagramPreview({ account, caption, media }: { account: PublishAccountDTO; caption: string; media: PreviewMedia[] }) {
  const first = media[0];
  // Instagram crops the feed to the first item's shape, clamped to 4:5 … 1.91:1. Reels show 4:5 in feed.
  const ratio =
    first?.kind === "IMAGE" && first.width && first.height
      ? Math.min(Math.max(first.width / first.height, INSTAGRAM_LIMITS.minAspectRatio), INSTAGRAM_LIMITS.maxAspectRatio)
      : first?.kind === "VIDEO"
        ? INSTAGRAM_LIMITS.minAspectRatio
        : 1;
  const handle = account.username ?? account.name.replace(/^@/, "");

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label="Instagram preview">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <AccountAvatar account={account} />
        <span className="truncate text-sm font-semibold">{handle}</span>
        <ProviderIcon provider="INSTAGRAM" className="ml-auto size-4 text-muted" />
      </header>
      <div className="relative bg-default" style={{ aspectRatio: ratio }}>
        {first ? (
          <MediaView item={first} className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
            <Picture className="size-6" aria-hidden />
            <span className="text-xs">Instagram needs a photo or video</span>
          </div>
        )}
        {media.length > 1 ? (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            1/{media.length}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3.5 px-3 pt-2.5 text-foreground" aria-hidden>
        <Heart className="size-5" />
        <Comment className="size-5" />
        <PaperPlane className="size-5" />
        {media.length > 1 ? (
          <span className="mx-auto flex gap-1">
            {media.map((m, i) => (
              <span key={m.key} className={`size-1.5 rounded-full ${i === 0 ? "bg-accent" : "bg-border"}`} />
            ))}
          </span>
        ) : null}
        <Bookmark className="ml-auto size-5" />
      </div>
      <p className="line-clamp-3 whitespace-pre-wrap break-words px-3 pb-3 pt-2 text-sm">
        <span className="font-semibold">{handle}</span> {caption}
      </p>
    </article>
  );
}

function FacebookPreview({ account, caption, media }: { account: PublishAccountDTO; caption: string; media: PreviewMedia[] }) {
  const tiles = media.slice(0, 4);
  const extra = media.length - tiles.length;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label="Facebook preview">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <AccountAvatar account={account} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{account.name}</span>
          <span className="text-xs text-muted">Just now · Public</span>
        </span>
        <ProviderIcon provider="FACEBOOK" className="ml-auto size-4 text-muted" />
      </header>
      {caption ? <p className="line-clamp-5 whitespace-pre-wrap break-words px-3 pb-2.5 text-sm">{caption}</p> : null}
      {tiles.length === 1 ? (
        <MediaView item={tiles[0]} className="max-h-96 w-full bg-default object-cover" />
      ) : tiles.length > 1 ? (
        <div className="grid grid-cols-2 gap-0.5 bg-border">
          {tiles.map((item, i) => (
            <div key={item.key} className="relative aspect-square bg-default">
              <MediaView item={item} className="absolute inset-0 size-full object-cover" />
              {extra > 0 && i === tiles.length - 1 ? (
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-xl font-semibold text-white">
                  +{extra}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-3 border-t border-border text-xs font-medium text-muted" aria-hidden>
        <span className="flex items-center justify-center gap-1.5 py-2.5">
          <ThumbsUp className="size-4" /> Like
        </span>
        <span className="flex items-center justify-center gap-1.5 py-2.5">
          <Comment className="size-4" /> Comment
        </span>
        <span className="flex items-center justify-center gap-1.5 py-2.5">
          <ArrowShapeTurnUpRight className="size-4" /> Share
        </span>
      </div>
    </article>
  );
}

/** Approximate look of the post on each selected network (first selected account per network). */
export function PostPreview({
  caption,
  media,
  accounts,
}: {
  caption: string;
  media: PreviewMedia[];
  accounts: PublishAccountDTO[];
}) {
  const instagram = accounts.find((a) => a.provider === "INSTAGRAM");
  const facebook = accounts.find((a) => a.provider === "FACEBOOK");

  if (!instagram && !facebook) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
        Select a destination to see a preview.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {instagram ? <InstagramPreview account={instagram} caption={caption} media={media} /> : null}
      {facebook ? <FacebookPreview account={facebook} caption={caption} media={media} /> : null}
    </div>
  );
}
