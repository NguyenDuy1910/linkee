"use client";

import { CircleCheck, CircleExclamation, TriangleExclamation } from "@gravity-ui/icons";
import { Alert, Button, Card, Description, Label, TextArea, TextField, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { publishPostAction, saveDraftAction } from "@/app/dashboard/publish/actions";
import type { MediaDTO } from "@/lib/media";
import type { DraftDTO, PublishAccountDTO } from "@/lib/publishing";
import {
  CAPTION_LIMITS,
  countHashtags,
  countMentions,
  INSTAGRAM_LIMITS,
  MAX_MEDIA,
  PROVIDER_LABELS,
  PUBLIC_MEDIA_URL_MESSAGE,
  UPLOAD_RULES,
  validateForProvider,
  type PublishProvider,
} from "@/lib/publishing-rules";
import { DestinationPicker } from "./destination-picker";
import { MediaTray, type MediaItem } from "./media-tray";
import { PostPreview } from "./post-preview";
import { DRAFT_DELETED_EVENT } from "./history-actions";
import { ProviderIcon } from "./provider-icon";

async function uploadFile(file: File): Promise<MediaDTO> {
  const res = await fetch(`/api/media?name=${encodeURIComponent(file.name)}`, {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : null;
    throw new Error(message ?? `Upload failed (HTTP ${res.status}).`);
  }
  return data as MediaDTO;
}

/** Client-side check before uploading; the server enforces the same limits. */
function rejectReason(file: File): string | null {
  const isImage = (UPLOAD_RULES.imageTypes as readonly string[]).includes(file.type);
  const isVideo = (UPLOAD_RULES.videoTypes as readonly string[]).includes(file.type);
  if (!isImage && !isVideo) return "Unsupported file type. Use JPEG, PNG, WebP, MP4 or MOV.";
  if (isImage && file.size > UPLOAD_RULES.imageMaxBytes) return "Photos can be at most 8 MB.";
  if (isVideo && file.size > UPLOAD_RULES.videoMaxBytes) return "Videos can be at most 100 MB.";
  return null;
}

export function Composer({
  accounts,
  draft,
  mediaPublishingAvailable,
}: {
  accounts: PublishAccountDTO[];
  draft: DraftDTO | null;
  /** False when APP_URL is not public HTTPS: Meta can't fetch media, text-only Facebook still works. */
  mediaPublishingAvailable: boolean;
}) {
  const router = useRouter();
  const [postId, setPostId] = useState<string | undefined>(draft?.id);
  const [caption, setCaption] = useState(draft?.caption ?? "");
  const [items, setItems] = useState<MediaItem[]>(() =>
    (draft?.media ?? []).map((media) => ({ key: media.id, status: "ready", media })),
  );
  const [selected, setSelected] = useState<string[]>(() =>
    accounts.filter((a) => a.status === "ACTIVE").map((a) => a.id),
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();

  // A deleted draft can't be saved or published again; keep the content as a new post instead.
  useEffect(() => {
    function onDraftDeleted(event: Event) {
      if ((event as CustomEvent<string>).detail === postId) setPostId(undefined);
    }
    window.addEventListener(DRAFT_DELETED_EVENT, onDraftDeleted);
    return () => window.removeEventListener(DRAFT_DELETED_EVENT, onDraftDeleted);
  }, [postId]);

  const readyMedia = items.flatMap((i) => (i.status === "ready" ? [i.media] : []));
  const isUploading = items.some((i) => i.status === "uploading");
  const selectedAccounts = accounts.filter((a) => a.status === "ACTIVE" && selected.includes(a.id));
  const selectedProviders = [...new Set(selectedAccounts.map((a) => a.provider))];
  const checks = selectedAccounts.map((account) => {
    const result = validateForProvider(account.provider, { caption, media: readyMedia });
    const errors = !mediaPublishingAvailable && readyMedia.length > 0 ? [PUBLIC_MEDIA_URL_MESSAGE, ...result.errors] : result.errors;
    return { account, errors, warnings: result.warnings };
  });
  const hasErrors = checks.some((c) => c.errors.length > 0);
  const hasContent = caption.trim().length > 0 || readyMedia.length > 0;
  const canPublish = selectedAccounts.length > 0 && !hasErrors && !isUploading && !isSaving;
  const mediaIds = readyMedia.map((m) => m.id);

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    const room = MAX_MEDIA - items.length;
    if (files.length > room) toast.danger(`You can attach up to ${MAX_MEDIA} files. ${files.length - room} not added.`);
    const accepted: { file: File; item: Extract<MediaItem, { status: "uploading" }> }[] = [];
    for (const file of files.slice(0, Math.max(room, 0))) {
      const reason = rejectReason(file);
      if (reason) {
        toast.danger(`${file.name}: ${reason}`);
        continue;
      }
      accepted.push({
        file,
        item: {
          key: crypto.randomUUID(),
          status: "uploading",
          name: file.name,
          kind: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
          previewUrl: URL.createObjectURL(file),
        },
      });
    }
    if (accepted.length === 0) return;
    setItems((prev) => [...prev, ...accepted.map((a) => a.item)]);

    for (const { file, item } of accepted) {
      uploadFile(file)
        .then((media) => {
          setItems((prev) => prev.map((i) => (i.key === item.key ? { key: item.key, status: "ready", media } : i)));
        })
        .catch((err: unknown) => {
          setItems((prev) => prev.filter((i) => i.key !== item.key));
          toast.danger(`Couldn't upload ${file.name}`, {
            description: err instanceof Error ? err.message : "Upload failed. Please try again.",
          });
        })
        .finally(() => URL.revokeObjectURL(item.previewUrl));
    }
  }

  function moveItem(key: string, delta: -1 | 1) {
    setItems((prev) => {
      const from = prev.findIndex((i) => i.key === key);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function saveDraft() {
    startSaving(async () => {
      const res = await saveDraftAction({ postId, caption, mediaIds });
      if (!res.ok) {
        toast.danger("Couldn't save draft", { description: res.error });
        return;
      }
      setPostId(res.data.postId);
      toast.success("Draft saved");
    });
  }

  function publish() {
    setServerError(null);
    startPublishing(async () => {
      const res = await publishPostAction({ postId, caption, mediaIds, accountIds: selectedAccounts.map((a) => a.id) });
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      const n = res.data.targetCount;
      toast.success(`Publishing to ${n} destination${n === 1 ? "" : "s"}`, {
        description: "Each destination's status updates below.",
      });
      setPostId(undefined);
      setCaption("");
      setItems([]);
      if (draft) router.replace("/dashboard/publish", { scroll: false });
      document.getElementById("history")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <Card.Content className="flex flex-col gap-7">
          {draft ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Editing draft</p>
          ) : null}

          <TextField value={caption} onChange={setCaption} className="flex flex-col gap-2">
            <Label>Caption</Label>
            <TextArea rows={6} placeholder="What do you want to share?" variant="secondary" />
            <Description>
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                {(selectedProviders.length > 0 ? selectedProviders : (["INSTAGRAM", "FACEBOOK"] as PublishProvider[])).map(
                  (provider) => (
                    <span
                      key={provider}
                      className={`flex items-center gap-1 tabular-nums ${caption.length > CAPTION_LIMITS[provider] ? "text-danger" : ""}`}
                    >
                      <ProviderIcon provider={provider} className="size-3" />
                      {caption.length.toLocaleString("en-US")} / {CAPTION_LIMITS[provider].toLocaleString("en-US")}
                      {provider === "INSTAGRAM"
                        ? ` · ${countHashtags(caption)}/${INSTAGRAM_LIMITS.hashtags} hashtags · ${countMentions(caption)}/${INSTAGRAM_LIMITS.mentions} mentions`
                        : null}
                    </span>
                  ),
                )}
              </span>
            </Description>
          </TextField>

          <section className="flex flex-col gap-2" aria-labelledby="media-heading">
            <h2 id="media-heading" className="text-sm font-medium">
              Media
            </h2>
            <MediaTray
              items={items}
              onAddFiles={addFiles}
              onRemove={(key) => setItems((prev) => prev.filter((i) => i.key !== key))}
              onMove={moveItem}
            />
          </section>

          <section className="flex flex-col gap-2" aria-labelledby="destinations-heading">
            <h2 id="destinations-heading" className="text-sm font-medium">
              Post to
            </h2>
            <DestinationPicker
              accounts={accounts}
              selected={selected}
              onToggle={(id, isSelected) =>
                setSelected((prev) => (isSelected ? [...prev, id] : prev.filter((x) => x !== id)))
              }
            />
          </section>

          {checks.length > 0 ? (
            <section aria-labelledby="checks-heading" className="flex flex-col gap-2">
              <h2 id="checks-heading" className="text-sm font-medium">
                Checks
              </h2>
              <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                {checks.map(({ account, errors, warnings }) => (
                  <li key={account.id} className="flex flex-col gap-1.5 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <ProviderIcon provider={account.provider} className="size-3.5 text-muted" />
                      <span className="truncate font-medium">{account.name}</span>
                      {errors.length === 0 ? (
                        <span className="ml-auto flex items-center gap-1 text-xs text-success">
                          <CircleCheck className="size-3.5" aria-hidden /> Ready
                        </span>
                      ) : (
                        <span className="ml-auto text-xs text-danger">
                          {errors.length} issue{errors.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    {errors.map((e) => (
                      <p key={e} className="flex gap-1.5 text-xs text-danger">
                        <CircleExclamation className="mt-px size-3.5 shrink-0" aria-hidden />
                        {e}
                      </p>
                    ))}
                    {warnings.map((w) => (
                      <p key={w} className="flex gap-1.5 text-xs text-warning">
                        <TriangleExclamation className="mt-px size-3.5 shrink-0" aria-hidden />
                        {w}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {serverError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Not published</Alert.Title>
                <Alert.Description className="whitespace-pre-line">{serverError}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-end">
            <p className="text-xs text-muted sm:mr-auto" aria-live="polite">
              {isUploading
                ? "Waiting for uploads to finish…"
                : selectedAccounts.length === 0
                  ? "Select at least one destination."
                  : hasErrors
                    ? "Fix the issues above to publish."
                    : `Ready for ${selectedAccounts.length} destination${selectedAccounts.length === 1 ? "" : "s"}.`}
            </p>
            <Button variant="secondary" onPress={saveDraft} isPending={isSaving} isDisabled={!hasContent || isUploading || isPublishing}>
              Save draft
            </Button>
            <Button variant="primary" onPress={publish} isPending={isPublishing} isDisabled={!canPublish}>
              Publish now
            </Button>
          </div>
        </Card.Content>
      </Card>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start" aria-label="Preview">
        <h2 className="text-sm font-medium text-muted">Preview</h2>
        <PostPreview
          caption={caption}
          accounts={selectedAccounts}
          media={items.map((i) =>
            i.status === "ready"
              ? { key: i.key, kind: i.media.kind, src: i.media.url, width: i.media.width, height: i.media.height }
              : { key: i.key, kind: i.kind, src: i.previewUrl, width: null, height: null },
          )}
        />
        {selectedProviders.length > 0 ? (
          <p className="text-xs text-muted">
            Previews are approximate. {selectedProviders.map((p) => PROVIDER_LABELS[p]).join(" and ")} may crop or
            truncate differently.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
