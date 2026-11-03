"use client";

import { Picture, TrashBin } from "@gravity-ui/icons";
import { Button, Description, FieldError, Input, Label, TextArea, TextField, toast } from "@heroui/react";
import Image from "next/image";
import { useRef, useState } from "react";
import { EditorSection } from "@/components/bio/editor/section";
import type { EditorErrors, EditorState } from "@/components/bio/editor/editor-model";
import { BIO_MAX, DISPLAY_NAME_MAX, initials } from "@/lib/bio";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

export function ProfileSection({
  state,
  errors,
  onChange,
}: {
  state: EditorState;
  errors: EditorErrors;
  onChange: (patch: Partial<EditorState>, clear: string[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.danger("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.danger("That image is larger than 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`/api/media?name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type },
      });
      const body = (await res.json().catch(() => null)) as { id?: string; url?: string; error?: string } | null;
      if (!res.ok || !body?.id || !body.url) throw new Error(body?.error ?? `Upload failed (${res.status}).`);
      onChange({ avatar: { id: body.id, url: body.url } }, ["avatarMediaId"]);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <EditorSection id="profile" title="Profile" description="How you appear at the top of your page.">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {state.avatar ? (
            <Image
              src={state.avatar.url}
              alt="Profile photo"
              width={64}
              height={64}
              unoptimized
              className="size-16 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-default text-lg font-semibold text-muted">
              {initials(state.displayName || state.slug)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
            <Button size="sm" variant="secondary" isPending={uploading} onPress={() => fileInput.current?.click()}>
              <Picture className="size-4" aria-hidden />
              {uploading ? "Uploading…" : state.avatar ? "Change photo" : "Upload photo"}
            </Button>
            {state.avatar ? (
              <Button size="sm" variant="ghost" isDisabled={uploading} onPress={() => onChange({ avatar: null }, ["avatarMediaId"])}>
                <TrashBin className="size-4" aria-hidden />
                Remove
              </Button>
            ) : null}
            {errors.avatarMediaId ? <p className="w-full text-xs text-danger">{errors.avatarMediaId}</p> : null}
          </div>
        </div>

        <TextField
          isRequired
          maxLength={DISPLAY_NAME_MAX}
          value={state.displayName}
          onChange={(displayName) => onChange({ displayName }, ["displayName"])}
          isInvalid={Boolean(errors.displayName)}
        >
          <Label>Display name</Label>
          <Input placeholder="Your name or brand" />
          <FieldError>{errors.displayName}</FieldError>
        </TextField>

        <TextField
          maxLength={BIO_MAX}
          value={state.bio}
          onChange={(bio) => onChange({ bio }, ["bio"])}
          isInvalid={Boolean(errors.bio)}
        >
          <Label>Bio</Label>
          <TextArea rows={3} placeholder="A sentence about you and what people will find here." className="resize-none" />
          <Description className="flex justify-end tabular-nums">
            {state.bio.length}/{BIO_MAX}
          </Description>
          <FieldError>{errors.bio}</FieldError>
        </TextField>
      </div>
    </EditorSection>
  );
}
