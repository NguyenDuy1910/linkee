"use client";

import { ArrowRotateLeft, Check } from "@gravity-ui/icons";
import {
  Button,
  ColorField,
  ColorSwatch,
  Label,
  Radio,
  RadioGroup,
  ToggleButton,
  ToggleButtonGroup,
  parseColor,
  type Key,
} from "@heroui/react";
import { EditorSection } from "@/components/bio/editor/section";
import type { EditorErrors } from "@/components/bio/editor/editor-model";
import { BUTTON_FILLS, BUTTON_SHAPES, FONTS, THEME_PRESETS, getPreset, type Theme } from "@/lib/bio";

type ColorKey = "background" | "text" | "accent";

const COLOR_FIELDS: { key: ColorKey; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Buttons" },
];

function OptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span id={`appearance-${label}`} className="text-sm font-medium">
        {label}
      </span>
      <ToggleButtonGroup
        aria-labelledby={`appearance-${label}`}
        selectionMode="single"
        disallowEmptySelection
        fullWidth
        size="sm"
        selectedKeys={[value]}
        onSelectionChange={(keys: Set<Key>) => {
          const next = [...keys][0];
          if (typeof next === "string") onChange(next as T);
        }}
      >
        {options.map((option, index) => (
          <ToggleButton key={option.id} id={option.id}>
            {index > 0 ? <ToggleButtonGroup.Separator /> : null}
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

export function AppearanceSection({
  theme,
  errors,
  onChange,
}: {
  theme: Theme;
  errors: EditorErrors;
  onChange: (theme: Theme, clear: string[]) => void;
}) {
  const preset = getPreset(theme.preset);
  const presetDefaults: Record<ColorKey, string> = {
    background: preset.baseColor,
    text: preset.text,
    accent: preset.accent,
  };

  function setColor(key: ColorKey, hex: string | undefined) {
    const next: Theme = { ...theme };
    if (hex) next[key] = hex.toLowerCase();
    else delete next[key];
    onChange(next, [`theme.${key}`]);
  }

  return (
    <EditorSection id="appearance" title="Appearance" description="Pick a look, then fine-tune it.">
      <div className="flex flex-col gap-6">
        <RadioGroup
          aria-label="Theme"
          value={theme.preset}
          onChange={(value) => {
            const id = THEME_PRESETS.find((p) => p.id === value)?.id;
            // A new preset starts clean: custom colors are cleared.
            if (id) onChange({ preset: id, font: theme.font, buttonShape: theme.buttonShape, buttonFill: theme.buttonFill }, []);
          }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {THEME_PRESETS.map((p) => (
            <Radio key={p.id} value={p.id} className="m-0">
              <Radio.Content className="group relative flex w-full cursor-pointer flex-col gap-2 rounded-xl border border-border p-2 transition-colors data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-focus data-[hovered=true]:border-muted data-[selected=true]:border-accent data-[selected=true]:ring-1 data-[selected=true]:ring-accent">
                <div aria-hidden className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg px-4" style={{ background: p.background }}>
                  <span className="h-1.5 w-10 rounded-full opacity-80" style={{ background: p.text }} />
                  <span className="h-3.5 w-full rounded-md" style={{ background: p.accent }} />
                  <span className="h-3.5 w-full rounded-md" style={{ background: p.accent }} />
                </div>
                <span className="flex items-center justify-between px-1 text-sm font-medium">
                  {p.label}
                  <Check className="size-4 text-accent opacity-0 group-data-[selected=true]:opacity-100" aria-hidden />
                </span>
                <Radio.Control className="sr-only">
                  <Radio.Indicator />
                </Radio.Control>
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>

        <OptionGroup label="Font" value={theme.font} options={FONTS} onChange={(font) => onChange({ ...theme, font }, [])} />
        <div className="grid gap-6 sm:grid-cols-2">
          <OptionGroup
            label="Button shape"
            value={theme.buttonShape}
            options={BUTTON_SHAPES}
            onChange={(buttonShape) => onChange({ ...theme, buttonShape }, [])}
          />
          <OptionGroup
            label="Button style"
            value={theme.buttonFill}
            options={BUTTON_FILLS}
            onChange={(buttonFill) => onChange({ ...theme, buttonFill }, [])}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">Custom colors</p>
            <p className="text-xs text-muted">Optional. Leave empty to use the theme&apos;s colors.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {COLOR_FIELDS.map(({ key, label }) => {
              const value = theme[key];
              const error = errors[`theme.${key}`];
              return (
                <div key={key} className="flex flex-col gap-1">
                  <ColorField
                    fullWidth
                    value={value ? parseColor(value) : null}
                    onChange={(color) => setColor(key, color ? color.toString("hex") : undefined)}
                    isInvalid={Boolean(error)}
                  >
                    <Label>{label}</Label>
                    <ColorField.Group>
                      <ColorField.Prefix>
                        <ColorSwatch color={value ?? presetDefaults[key]} size="xs" />
                      </ColorField.Prefix>
                      <ColorField.Input placeholder={presetDefaults[key].toUpperCase()} />
                      {value ? (
                        <ColorField.Suffix>
                          <Button isIconOnly size="sm" variant="ghost" aria-label={`Reset ${label.toLowerCase()} color`} onPress={() => setColor(key, undefined)}>
                            <ArrowRotateLeft className="size-3.5" />
                          </Button>
                        </ColorField.Suffix>
                      ) : null}
                    </ColorField.Group>
                  </ColorField>
                  {error ? <p className="text-xs text-danger">{error}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </EditorSection>
  );
}
