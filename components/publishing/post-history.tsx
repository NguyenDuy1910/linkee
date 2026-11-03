import { ArrowUpRightFromSquare, Pencil, Picture } from "@gravity-ui/icons";
import { buttonVariants, Chip, Spinner } from "@heroui/react";
import NextLink from "next/link";
import type { PostHistoryItem, TargetDTO } from "@/lib/publishing";
import { DeleteDraftButton, LocalDateTime, PublishingAutoRefresh, RetryTargetButton } from "./history-actions";
import { ProviderIcon } from "./provider-icon";

const STATUS_CHIP = {
  PENDING: { label: "Pending", color: "default" },
  PUBLISHING: { label: "Publishing", color: "accent" },
  PUBLISHED: { label: "Published", color: "success" },
  FAILED: { label: "Failed", color: "danger" },
} as const;

function TargetRow({ target }: { target: TargetDTO }) {
  const chip = STATUS_CHIP[target.status];
  return (
    <li className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <ProviderIcon provider={target.provider} className="size-3.5 text-muted" />
        <span className="min-w-0 truncate text-sm font-medium">{target.accountName}</span>
        <Chip size="sm" variant="soft" color={chip.color}>
          {target.status === "PUBLISHING" ? <Spinner size="sm" color="current" className="size-3" /> : null}
          {chip.label}
        </Chip>
        <span className="ml-auto flex items-center gap-2">
          {target.status === "PUBLISHED" && target.remoteUrl ? (
            <a
              href={target.remoteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
            >
              View post
              <ArrowUpRightFromSquare className="size-3" aria-hidden />
            </a>
          ) : null}
          {target.status === "FAILED" ? <RetryTargetButton targetId={target.id} accountName={target.accountName} /> : null}
        </span>
      </div>
      {target.error && target.status !== "PUBLISHED" ? (
        <p className={`text-xs ${target.status === "FAILED" ? "text-danger" : "text-muted"}`}>{target.error}</p>
      ) : null}
    </li>
  );
}

function Thumb({ post }: { post: PostHistoryItem }) {
  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-default">
      {post.cover?.kind === "IMAGE" ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads served from /media
        <img src={post.cover.url} alt="" className="size-full object-cover" />
      ) : post.cover?.kind === "VIDEO" ? (
        <video src={post.cover.url} muted playsInline preload="metadata" className="size-full object-cover" aria-hidden />
      ) : (
        <div className="grid size-full place-items-center text-muted">
          <Picture className="size-5" aria-hidden />
        </div>
      )}
      {post.mediaCount > 1 ? (
        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] font-medium text-white">
          +{post.mediaCount - 1}
        </span>
      ) : null}
    </div>
  );
}

/** Recent posts (drafts first) with live per-destination status. */
export function PostHistory({ posts, canPublish }: { posts: PostHistoryItem[]; canPublish: boolean }) {
  const inFlight = posts.some((p) => p.targets.some((t) => t.status === "PENDING" || t.status === "PUBLISHING"));

  return (
    <section id="history" aria-labelledby="history-heading" className="scroll-mt-6">
      <PublishingAutoRefresh active={inFlight} />
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="history-heading" className="text-lg font-semibold tracking-tight">
          Recent posts
        </h2>
        {inFlight ? <span className="text-xs text-muted">Updating live</span> : null}
      </div>
      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
          Posts you publish or save as drafts will appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id} className="flex gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <Thumb post={post} />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`line-clamp-2 whitespace-pre-line break-words text-sm ${post.caption ? "" : "text-muted"}`}>
                      {post.caption || "No caption"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {post.status === "DRAFT" ? "Saved " : "Submitted "}
                      <LocalDateTime value={post.submittedAt ?? post.createdAt} />
                    </p>
                  </div>
                  {post.status === "DRAFT" ? (
                    <Chip size="sm" variant="soft">
                      Draft
                    </Chip>
                  ) : null}
                </div>
                {post.status === "DRAFT" ? (
                  <div className="flex gap-2">
                    {canPublish ? (
                      <NextLink
                        href={`/dashboard/publish?edit=${post.id}`}
                        className={buttonVariants({ variant: "secondary", size: "sm" })}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Edit
                      </NextLink>
                    ) : null}
                    <DeleteDraftButton postId={post.id} />
                  </div>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {post.targets.map((t) => (
                      <TargetRow key={t.id} target={t} />
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
