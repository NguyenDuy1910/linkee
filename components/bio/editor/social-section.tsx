"use client";

import { Plus, TrashBin } from "@gravity-ui/icons";
import { Button, FieldError, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { SocialIcon } from "@/components/bio/social-icon";
import { EditorSection } from "@/components/bio/editor/section";
import { newKey, type EditorErrors, type EditorSocial } from "@/components/bio/editor/editor-model";
import { MAX_SOCIAL_LINKS, SOCIAL_PLATFORMS, URL_MAX, type SocialPlatform } from "@/lib/bio";

export function SocialSection({
  socials,
  errors,
  onChange,
}: {
  socials: EditorSocial[];
  errors: EditorErrors;
  onChange: (socials: EditorSocial[], clear: string[]) => void;
}) {
  const used = new Set(socials.map((s) => s.platform));
  const firstUnused = SOCIAL_PLATFORMS.find((p) => !used.has(p.id));
  const canAdd = Boolean(firstUnused) && socials.length < MAX_SOCIAL_LINKS;

  function update(key: string, patch: Partial<EditorSocial>) {
    onChange(
      socials.map((s) => (s.key === key ? { ...s, ...patch } : s)),
      Object.keys(patch).map((field) => `social:${key}:${field}`),
    );
  }

  function add() {
    if (!firstUnused) return;
    onChange([...socials, { key: newKey("social"), platform: firstUnused.id, url: "" }], ["socialLinks"]);
  }

  return (
    <EditorSection
      id="social"
      title="Social icons"
      description="Small icons under your bio that link to your profiles."
      action={
        <Button size="sm" variant="secondary" onPress={add} isDisabled={!canAdd}>
          <Plus className="size-4" aria-hidden />
          Add icon
        </Button>
      }
    >
      {errors.socialLinks ? <p className="mb-3 text-sm text-danger">{errors.socialLinks}</p> : null}
      {socials.length === 0 ? (
        <p className="text-sm text-muted">No social icons yet. Add Instagram, TikTok, YouTube, email and more.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {socials.map((social) => {
            const platform = SOCIAL_PLATFORMS.find((p) => p.id === social.platform) ?? SOCIAL_PLATFORMS[0];
            const options = SOCIAL_PLATFORMS.filter((p) => p.id === social.platform || !used.has(p.id));
            return (
              <li key={social.key} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-start gap-2">
                <Select
                  aria-label="Platform"
                  value={social.platform}
                  onChange={(value) => {
                    if (typeof value === "string") update(social.key, { platform: value as SocialPlatform });
                  }}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {options.map((p) => (
                        <ListBox.Item key={p.id} id={p.id} textValue={p.label}>
                          <SocialIcon platform={p.id} className="size-4" />
                          {p.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <TextField
                  maxLength={URL_MAX}
                  value={social.url}
                  onChange={(url) => update(social.key, { url })}
                  isInvalid={Boolean(errors[`social:${social.key}:url`])}
                >
                  <Label className="sr-only">{`${platform.label} ${social.platform === "email" ? "address" : "URL"}`}</Label>
                  <Input placeholder={platform.placeholder} autoCapitalize="none" spellCheck={false} />
                  <FieldError>{errors[`social:${social.key}:url`]}</FieldError>
                </TextField>
                <Button
                  isIconOnly
                  variant="ghost"
                  aria-label={`Remove ${platform.label}`}
                  className="text-danger"
                  onPress={() => onChange(socials.filter((s) => s.key !== social.key), [])}
                >
                  <TrashBin className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </EditorSection>
  );
}
