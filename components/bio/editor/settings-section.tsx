"use client";

import { Description, FieldError, InputGroup, Label, Switch, TextField } from "@heroui/react";
import { EditorSection } from "@/components/bio/editor/section";
import type { EditorErrors, EditorState } from "@/components/bio/editor/editor-model";
import { SLUG_MAX } from "@/lib/bio";

export function SettingsSection({
  state,
  errors,
  onChange,
}: {
  state: EditorState;
  errors: EditorErrors;
  onChange: (patch: Partial<EditorState>, clear: string[]) => void;
}) {
  return (
    <EditorSection id="page-settings" title="Page settings" description="Your address and who can see it.">
      <div className="flex flex-col gap-5">
        <TextField
          isRequired
          maxLength={SLUG_MAX}
          value={state.slug}
          onChange={(value) => onChange({ slug: value.toLowerCase().replace(/\s+/g, "") }, ["slug"])}
          isInvalid={Boolean(errors.slug)}
        >
          <Label>Username</Label>
          <InputGroup>
            <InputGroup.Prefix className="text-muted">linkee.bio/</InputGroup.Prefix>
            <InputGroup.Input autoCapitalize="none" spellCheck={false} />
          </InputGroup>
          {errors.slug ? (
            <FieldError>{errors.slug}</FieldError>
          ) : (
            <Description>Changing it breaks links you&apos;ve already shared. Availability is checked when you save.</Description>
          )}
        </TextField>

        <Switch isSelected={state.published} onChange={(published) => onChange({ published }, [])}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <span className="flex flex-col">
              <span className="text-sm font-medium">Published</span>
              <span className="text-xs text-muted">
                {state.published ? "Anyone with your link can see your page." : "Your page is hidden and shows a “not found” message."}
              </span>
            </span>
          </Switch.Content>
        </Switch>
      </div>
    </EditorSection>
  );
}
