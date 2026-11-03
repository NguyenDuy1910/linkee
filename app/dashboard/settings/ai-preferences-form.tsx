"use client";

import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  Select,
  TextArea,
  TextField,
  toast,
  type Key,
} from "@heroui/react";
import { useState, useTransition } from "react";
import { saveAiPreferencesAction } from "@/app/dashboard/settings/actions";
import { BRAND_CONTEXT_MAX, LANGUAGE_OPTIONS, SKIP_KEYWORDS_MAX, TONE_OPTIONS, splitKeywords, type ToneValue } from "@/lib/ai/preferences";

export interface AiPreferencesValues {
  tone: ToneValue;
  language: string;
  brandContext: string;
  skipKeywords: string[];
}

export function AiPreferencesForm({ initial }: { initial: AiPreferencesValues }) {
  const [tone, setTone] = useState<ToneValue>(initial.tone);
  const [language, setLanguage] = useState(initial.language);
  const [brandContext, setBrandContext] = useState(initial.brandContext);
  const [keywords, setKeywords] = useState(initial.skipKeywords.join(", "));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const keywordCount = splitKeywords(keywords).length;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveAiPreferencesAction({ tone, language, brandContext, skipKeywords: keywords });
      if (res.ok) {
        setErrors({});
        toast.success("AI preferences saved");
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.danger(res.error);
      }
    });
  }

  return (
    <Form className="flex flex-col gap-6" onSubmit={submit}>
      <RadioGroup
        value={tone}
        onChange={(v) => setTone(v as ToneValue)}
        name="tone"
        orientation="horizontal"
        variant="secondary"
        isInvalid={Boolean(errors.tone)}
      >
        <Label>Tone</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {TONE_OPTIONS.map((t) => (
            <Radio key={t.value} value={t.value} className="rounded-xl border border-border p-3">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t.label}
              </Radio.Content>
              <Description>{t.description}</Description>
            </Radio>
          ))}
        </div>
        <FieldError>{errors.tone}</FieldError>
      </RadioGroup>

      <Select
        className="w-full sm:max-w-xs"
        name="language"
        value={language}
        onChange={(key: Key | null) => key !== null && setLanguage(String(key))}
        variant="secondary"
        isInvalid={Boolean(errors.language)}
      >
        <Label>Reply language</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {LANGUAGE_OPTIONS.map((l) => (
              <ListBox.Item key={l.value} id={l.value} textValue={l.label}>
                {l.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        <FieldError>{errors.language}</FieldError>
      </Select>

      <TextField name="brandContext" value={brandContext} onChange={setBrandContext} isInvalid={Boolean(errors.brandContext)}>
        <Label>Brand context</Label>
        <TextArea
          rows={4}
          maxLength={BRAND_CONTEXT_MAX}
          variant="secondary"
          placeholder="e.g. I'm Maya, a Brooklyn ceramicist. I sell handmade mugs via the link in my bio and ship within the US."
        />
        <Description className="flex justify-between gap-3">
          <span>Who you are and what you offer. The AI uses this for context but never invents details beyond it.</span>
          <span className="shrink-0 tabular-nums">
            {brandContext.length}/{BRAND_CONTEXT_MAX}
          </span>
        </Description>
        <FieldError>{errors.brandContext}</FieldError>
      </TextField>

      <TextField name="skipKeywords" value={keywords} onChange={setKeywords} isInvalid={Boolean(errors.skipKeywords)}>
        <Label>Auto-reply skip keywords</Label>
        <Input variant="secondary" placeholder="refund, giveaway, collab" />
        <Description className="flex justify-between gap-3">
          <span>Comma-separated. Auto-reply never answers comments containing these words — handle them yourself.</span>
          <span className={`shrink-0 tabular-nums ${keywordCount > SKIP_KEYWORDS_MAX ? "text-danger" : ""}`}>
            {keywordCount}/{SKIP_KEYWORDS_MAX}
          </span>
        </Description>
        <FieldError>{errors.skipKeywords}</FieldError>
      </TextField>

      <div>
        <Button type="submit" variant="primary" isPending={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </Form>
  );
}
