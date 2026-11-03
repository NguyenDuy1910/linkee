"use client";

import { ArrowLeft, ArrowRight, CloudArrowUpIn, Xmark } from "@gravity-ui/icons";
import { Button, Spinner } from "@heroui/react";
import { useRef, useState } from "react";
import type { MediaDTO } from "@/lib/media";
import { ACCEPTED_UPLOAD_TYPES, MAX_MEDIA } from "@/lib/publishing-rules";

export type MediaItem =
  | { key: string; status: "uploading"; name: string; kind: "IMAGE" | "VIDEO"; previewUrl: string }
  | { key: string; status: "ready"; media: MediaDTO };

export function MediaTray({
  items,
  onAddFiles,
  onRemove,
  onMove,
}: {
  items: MediaItem[];
  onAddFiles: (files: File[]) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, delta: -1 | 1) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isFull = items.length >= MAX_MEDIA;

  return (
    <div className="flex flex-col gap-3">
      {!isFull ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            onAddFiles(Array.from(e.dataTransfer.files));
          }}
          className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-7 text-center transition-colors ${
            isDragging ? "border-accent bg-accent/5" : "border-border bg-background"
          }`}
        >
          <div className="grid size-10 place-items-center rounded-full bg-default text-muted">
            <CloudArrowUpIn className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium">Drop photos or a video here</p>
            <p className="mt-0.5 text-xs text-muted">
              JPEG, PNG or WebP up to 8 MB · MP4 or MOV up to 100 MB · {items.length}/{MAX_MEDIA}
            </p>
          </div>
          <Button size="sm" variant="secondary" onPress={() => inputRef.current?.click()}>
            Choose files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_UPLOAD_TYPES}
            className="sr-only"
            tabIndex={-1}
            aria-label="Add photos or videos"
            onChange={(e) => {
              onAddFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <p className="text-xs text-muted">You&apos;ve added the maximum of {MAX_MEDIA} files.</p>
      )}

      {items.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Attached media">
          {items.map((item, index) => {
            const kind = item.status === "ready" ? item.media.kind : item.kind;
            const src = item.status === "ready" ? item.media.url : item.previewUrl;
            const label = item.status === "ready" ? `${kind === "IMAGE" ? "Photo" : "Video"} ${index + 1}` : item.name;
            return (
              <li key={item.key} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-default">
                {kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob/uploaded previews
                  <img src={src} alt={label} className="size-full object-cover" />
                ) : (
                  <video src={src} muted playsInline preload="metadata" aria-label={label} className="size-full object-cover" />
                )}
                {kind === "VIDEO" ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Video
                  </span>
                ) : null}
                {item.status === "uploading" ? (
                  <div className="absolute inset-0 grid place-items-center bg-background/70" role="status">
                    <Spinner size="sm" />
                    <span className="sr-only">Uploading {item.name}</span>
                  </div>
                ) : null}
                <div className="absolute inset-x-1 top-1 flex justify-between gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  <div className="flex gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="secondary"
                      aria-label={`Move ${label} earlier`}
                      isDisabled={index === 0}
                      onPress={() => onMove(item.key, -1)}
                      className="size-7 min-w-7"
                    >
                      <ArrowLeft className="size-3.5" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="secondary"
                      aria-label={`Move ${label} later`}
                      isDisabled={index === items.length - 1}
                      onPress={() => onMove(item.key, 1)}
                      className="size-7 min-w-7"
                    >
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="secondary"
                    aria-label={`Remove ${label}`}
                    onPress={() => onRemove(item.key)}
                    className="size-7 min-w-7"
                  >
                    <Xmark className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
