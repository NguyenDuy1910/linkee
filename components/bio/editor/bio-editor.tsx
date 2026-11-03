"use client";

import { ArrowUpRightFromSquare, Eye, Pencil } from "@gravity-ui/icons";
import { Alert, Button, Chip, CloseButton, ToggleButton, ToggleButtonGroup, buttonVariants, toast, type Key } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveBioPage } from "@/app/dashboard/my-page/actions";
import type { BioEditorData } from "@/app/dashboard/my-page/data";
import { BioPageView } from "@/components/bio/bio-page-view";
import { CopyLinkButton } from "@/components/bio/copy-link-button";
import { AppearanceSection } from "@/components/bio/editor/appearance-section";
import {
  fromData,
  mapServerErrors,
  serialize,
  toInput,
  toPreview,
  type EditorErrors,
  type EditorState,
} from "@/components/bio/editor/editor-model";
import { LinksSection } from "@/components/bio/editor/links-section";
import { ProfileSection } from "@/components/bio/editor/profile-section";
import { SettingsSection } from "@/components/bio/editor/settings-section";
import { SocialSection } from "@/components/bio/editor/social-section";
import { PhoneFrame } from "@/components/bio/phone-frame";
import { PageHeader } from "@/components/layout/page-header";

export function BioEditor({ initial, appUrl, welcome }: { initial: BioEditorData; appUrl: string; welcome: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => fromData(initial));
  const [state, setState] = useState(saved);
  const [errors, setErrors] = useState<EditorErrors>({});
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [showWelcome, setShowWelcome] = useState(welcome);
  const [isSaving, startSaving] = useTransition();

  const dirty = serialize(state) !== serialize(saved);
  const publicUrl = `${appUrl}/${saved.slug}`;
  const preview = toPreview(state);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(patch: Partial<EditorState>, clear: string[]) {
    setState((s) => ({ ...s, ...patch }));
    if (clear.length > 0) {
      setErrors((e) => {
        if (!clear.some((k) => k in e)) return e;
        const next = { ...e };
        for (const key of clear) delete next[key];
        return next;
      });
    }
  }

  function save() {
    const submitted = state;
    startSaving(async () => {
      try {
        const result = await saveBioPage(toInput(submitted));
        if (!result.ok) {
          setErrors(mapServerErrors(result.fieldErrors, submitted));
          if (result.fieldErrors?.slug) setView("edit");
          toast.danger(result.error);
          return;
        }
        const next = fromData(result.data);
        setSaved(next);
        setState(next);
        setErrors({});
        setFocusKey(null);
        toast.success("Changes saved");
        // Refresh server components (e.g. the sidebar's page link after a username change).
        router.refresh();
      } catch {
        toast.danger("We couldn't save your changes. Check your connection and try again.");
      }
    });
  }

  return (
    <>
      <PageHeader
        title="My Page"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>
              linkee.bio/<span className="font-medium text-foreground">{saved.slug}</span>
            </span>
            {!saved.published ? (
              <Chip size="sm" variant="soft" color="warning">
                Unpublished
              </Chip>
            ) : null}
            {dirty ? (
              <Chip size="sm" variant="soft" color="accent">
                Unsaved changes
              </Chip>
            ) : null}
          </span>
        }
        actions={
          <>
            <CopyLinkButton url={publicUrl} />
            {saved.published ? (
              <a href={`/${saved.slug}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "secondary" })}>
                <ArrowUpRightFromSquare className="size-4" aria-hidden />
                View page
              </a>
            ) : null}
            <Button onPress={save} isDisabled={!dirty} isPending={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      />

      {showWelcome ? (
        <Alert status="success" className="mb-6">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Your page is live at linkee.bio/{saved.slug}</Alert.Title>
            <Alert.Description>Add your first link below, then share your page anywhere.</Alert.Description>
          </Alert.Content>
          <CloseButton aria-label="Dismiss" onPress={() => setShowWelcome(false)} />
        </Alert>
      ) : null}

      <ToggleButtonGroup
        aria-label="Editor view"
        selectionMode="single"
        disallowEmptySelection
        fullWidth
        className="mb-5 lg:hidden"
        selectedKeys={[view]}
        onSelectionChange={(keys: Set<Key>) => {
          const next = [...keys][0];
          if (next === "edit" || next === "preview") setView(next);
        }}
      >
        <ToggleButton id="edit">
          <Pencil className="size-4" aria-hidden />
          Edit
        </ToggleButton>
        <ToggleButton id="preview">
          <ToggleButtonGroup.Separator />
          <Eye className="size-4" aria-hidden />
          Preview
        </ToggleButton>
      </ToggleButtonGroup>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`flex min-w-0 flex-col gap-6 ${view === "preview" ? "hidden lg:flex" : ""}`}>
          <ProfileSection state={state} errors={errors} onChange={update} />
          <LinksSection
            links={state.links}
            errors={errors}
            focusKey={focusKey}
            onAdd={setFocusKey}
            onChange={(links, clear) => update({ links }, clear)}
          />
          <SocialSection socials={state.socialLinks} errors={errors} onChange={(socialLinks, clear) => update({ socialLinks }, clear)} />
          <AppearanceSection theme={state.theme} errors={errors} onChange={(theme, clear) => update({ theme }, clear)} />
          <SettingsSection state={state} errors={errors} onChange={update} />
        </div>

        <aside aria-label="Live preview" className={`${view === "edit" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-10">
            <p className="mb-3 hidden text-center text-xs font-medium tracking-wide text-muted uppercase lg:block">Live preview</p>
            <PhoneFrame label="Preview of your page">
              <BioPageView page={preview} linkHref={(link) => link.url || null} openInNewTab className="min-h-full" />
            </PhoneFrame>
          </div>
        </aside>
      </div>

      {/* Mobile: keep saving within thumb reach once there is something to save. */}
      {dirty ? (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-lg md:hidden">
          <span className="text-sm font-medium">Unsaved changes</span>
          <Button size="sm" onPress={save} isPending={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      ) : null}
    </>
  );
}
