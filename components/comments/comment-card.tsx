"use client";

import { ArrowUpRightFromSquare, ArrowUturnCcwLeft, Comment as CommentIcon, PaperPlane, Sparkles } from "@gravity-ui/icons";
import { Avatar, Button, Chip, Description, Label, Spinner, TextArea, TextField, toast } from "@heroui/react";
import { useState, useTransition } from "react";
import { sendReplyAction, setCommentStatusAction, suggestReplyAction } from "@/app/dashboard/inbox/actions";

export type AiAvailability = "ready" | "upgrade" | "not_configured";

export interface InboxCommentView {
  id: string;
  authorUsername: string | null;
  text: string;
  timeLabel: string;
  timeTitle: string;
  status: "NEW" | "REPLIED" | "SKIPPED";
  media: { caption: string | null; permalink: string | null; thumbnailUrl: string | null };
  sentReply: { text: string; timeLabel: string; source: "AI" | "MANUAL" | "AUTO" } | null;
  /** Persisted AI suggestion (no AI call needed to show it). */
  draft: string | null;
  /** Error from the latest failed send, if the comment is still unanswered. */
  lastError: string | null;
}

const REPLY_MAX = 1000;

const STATUS_CHIP = {
  NEW: { label: "New", color: "accent" },
  REPLIED: { label: "Replied", color: "success" },
  SKIPPED: { label: "Skipped", color: "default" },
} as const;

const SOURCE_LABEL = { AI: "AI-assisted", MANUAL: "Written by you", AUTO: "Auto-reply" } as const;

export function CommentCard({
  comment,
  ai,
  canReply,
  upgradeUrl,
}: {
  comment: InboxCommentView;
  ai: AiAvailability;
  /** False while the account needs reconnecting. */
  canReply: boolean;
  upgradeUrl: string | null;
}) {
  const [open, setOpen] = useState(comment.draft !== null);
  const [text, setText] = useState(comment.draft ?? "");
  const [fromAi, setFromAi] = useState(comment.draft !== null);
  const [error, setError] = useState<string | null>(comment.lastError);
  const [aiSkipped, setAiSkipped] = useState(false);
  const [suggesting, startSuggest] = useTransition();
  const [sending, startSend] = useTransition();
  const [moving, startMove] = useTransition();
  const busy = suggesting || sending || moving;
  const author = comment.authorUsername ? `@${comment.authorUsername}` : "Instagram user";
  const chip = STATUS_CHIP[comment.status];

  function suggest(regenerate: boolean) {
    setOpen(true);
    startSuggest(async () => {
      const res = await suggestReplyAction(comment.id, regenerate);
      if (!res.ok) {
        setError(res.error);
        toast.danger(res.error);
        return;
      }
      setError(null);
      if (res.data.skip) {
        setAiSkipped(true);
        return;
      }
      setAiSkipped(false);
      setText(res.data.text);
      setFromAi(true);
    });
  }

  function send() {
    const reply = text.trim();
    if (!reply || busy) return;
    startSend(async () => {
      const res = await sendReplyAction({ commentId: comment.id, text: reply, source: fromAi ? "AI" : "MANUAL" });
      if (!res.ok) {
        setError(res.error);
        toast.danger(res.error);
        return;
      }
      setError(null);
      toast.success(`Reply posted to ${author}`);
    });
  }

  function move(status: "NEW" | "SKIPPED") {
    startMove(async () => {
      const res = await setCommentStatusAction(comment.id, status);
      if (!res.ok) toast.danger(res.error);
      else toast.success(status === "SKIPPED" ? "Comment skipped" : "Moved back to inbox");
    });
  }

  return (
    <article
      aria-label={`Comment from ${author}`}
      className="rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-sm sm:p-5"
    >
      <div className="flex gap-3">
        <Avatar size="sm" className="shrink-0">
          <Avatar.Fallback>{(comment.authorUsername ?? "IG").slice(0, 2).toUpperCase()}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold">{author}</span>
            <time className="text-xs text-muted" title={comment.timeTitle}>
              {comment.timeLabel}
            </time>
            <Chip size="sm" variant="soft" color={chip.color} className="ml-auto">
              {chip.label}
            </Chip>
          </div>
          <p className="mt-1.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap">{comment.text}</p>

          <PostContext media={comment.media} />

          {comment.sentReply ? (
            <div className="mt-4 rounded-xl bg-default/60 p-3">
              <p className="text-xs text-muted">
                Your reply · {comment.sentReply.timeLabel} · {SOURCE_LABEL[comment.sentReply.source]}
              </p>
              <p className="mt-1 text-sm break-words whitespace-pre-wrap">{comment.sentReply.text}</p>
            </div>
          ) : null}

          {comment.status !== "REPLIED" && canReply ? (
            <div className="mt-4">
              {open ? (
                <div className="flex flex-col gap-2">
                  <TextField
                    value={text}
                    onChange={(v) => {
                      setText(v);
                      if (!v.trim()) setFromAi(false);
                    }}
                    isDisabled={sending}
                  >
                    <Label className="sr-only">Reply to {author}</Label>
                    <TextArea
                      autoFocus={comment.draft === null}
                      rows={3}
                      maxLength={REPLY_MAX}
                      placeholder={suggesting ? "Writing a suggestion…" : `Reply to ${author}…`}
                      className="w-full"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />
                    <Description className="flex justify-between gap-2">
                      <span>{fromAi ? "AI suggestion — edit freely before sending." : "Posts publicly as your account."}</span>
                      <span className="tabular-nums">
                        {text.length}/{REPLY_MAX}
                      </span>
                    </Description>
                  </TextField>
                  {aiSkipped ? (
                    <p className="text-sm text-warning">
                      The AI suggests not replying publicly to this one (it looks like spam, abuse, or needs a private conversation).
                    </p>
                  ) : null}
                  {error ? (
                    <p role="alert" className="text-sm text-danger">
                      {error}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <AiButton ai={ai} label={fromAi ? "Regenerate" : "Suggest reply"} pending={suggesting} disabled={sending} onPress={() => suggest(fromAi)} upgradeUrl={upgradeUrl} />
                    <div className="ml-auto flex items-center gap-2">
                      <Button variant="ghost" size="sm" isDisabled={busy} onPress={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" isPending={sending} isDisabled={!text.trim() || suggesting || moving} onPress={send}>
                        {({ isPending }) => (
                          <>
                            {isPending ? <Spinner color="current" size="sm" /> : <PaperPlane className="size-4" aria-hidden />}
                            {isPending ? "Sending…" : "Send reply"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onPress={() => setOpen(true)}>
                    <CommentIcon className="size-4" aria-hidden />
                    Reply
                  </Button>
                  <AiButton ai={ai} label="Suggest reply" pending={suggesting} disabled={busy} onPress={() => suggest(false)} upgradeUrl={upgradeUrl} />
                  <div className="ml-auto">
                    {comment.status === "SKIPPED" ? (
                      <Button variant="ghost" size="sm" isPending={moving} isDisabled={busy} onPress={() => move("NEW")}>
                        <ArrowUturnCcwLeft className="size-4" aria-hidden />
                        Move back to inbox
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" isPending={moving} isDisabled={busy} onPress={() => move("SKIPPED")}>
                        Skip
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {!open && error ? (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AiButton({
  ai,
  label,
  pending,
  disabled,
  onPress,
  upgradeUrl,
}: {
  ai: AiAvailability;
  label: string;
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
  upgradeUrl: string | null;
}) {
  if (ai === "upgrade") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Sparkles className="size-3.5" aria-hidden />
        AI suggestions are part of Linkee Pro
        {upgradeUrl ? (
          <a href={upgradeUrl} className="font-medium text-accent underline-offset-2 hover:underline">
            Upgrade
          </a>
        ) : null}
      </span>
    );
  }
  if (ai === "not_configured") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted" title="Set OPENROUTER_API_KEY on the server to enable AI suggestions.">
        <Sparkles className="size-3.5" aria-hidden />
        AI not configured
      </span>
    );
  }
  return (
    <Button variant="tertiary" size="sm" isPending={pending} isDisabled={disabled} onPress={onPress}>
      {({ isPending }) => (
        <>
          {isPending ? <Spinner color="current" size="sm" /> : <Sparkles className="size-4" aria-hidden />}
          {isPending ? "Thinking…" : label}
        </>
      )}
    </Button>
  );
}

function PostContext({ media }: { media: InboxCommentView["media"] }) {
  if (!media.caption && !media.permalink && !media.thumbnailUrl) return null;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-2 pr-3">
      {media.thumbnailUrl ? (
        // Instagram CDN URLs are signed and short-lived; next/image optimization adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.thumbnailUrl} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg bg-default object-cover" />
      ) : null}
      <p className="min-w-0 flex-1 truncate text-xs text-muted">{media.caption || "Your post"}</p>
      {media.permalink ? (
        <a
          href={media.permalink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded text-xs font-medium text-foreground outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-focus"
        >
          View post
          <ArrowUpRightFromSquare className="size-3" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
