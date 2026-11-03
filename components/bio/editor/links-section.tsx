"use client";

import { ArrowDown, ArrowUp, Link as LinkIcon, Plus, TrashBin } from "@gravity-ui/icons";
import { Button, Chip, FieldError, Input, Label, Switch, TextField } from "@heroui/react";
import { EditorSection } from "@/components/bio/editor/section";
import { newKey, type EditorErrors, type EditorLink } from "@/components/bio/editor/editor-model";
import { LINK_TITLE_MAX, MAX_LINKS, URL_MAX } from "@/lib/bio";

export function LinksSection({
  links,
  errors,
  focusKey,
  onChange,
  onAdd,
}: {
  links: EditorLink[];
  errors: EditorErrors;
  /** Key of a just-added link whose title field should take focus. */
  focusKey: string | null;
  onChange: (links: EditorLink[], clear: string[]) => void;
  onAdd: (key: string) => void;
}) {
  function update(key: string, patch: Partial<EditorLink>) {
    onChange(
      links.map((l) => (l.key === key ? { ...l, ...patch } : l)),
      Object.keys(patch).map((field) => `link:${key}:${field}`),
    );
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...links];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next, []);
  }

  function add() {
    const key = newKey("link");
    onChange([{ key, title: "", url: "", isActive: true, clicks: 0 }, ...links], ["links"]);
    onAdd(key);
  }

  const atLimit = links.length >= MAX_LINKS;

  return (
    <EditorSection
      id="links"
      title="Links"
      description="Buttons your visitors tap. The top link gets the most attention."
      action={
        <Button size="sm" onPress={add} isDisabled={atLimit}>
          <Plus className="size-4" aria-hidden />
          Add link
        </Button>
      }
    >
      {errors.links ? <p className="mb-3 text-sm text-danger">{errors.links}</p> : null}
      {links.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <div className="mb-3 grid size-10 place-items-center rounded-full bg-default text-muted">
            <LinkIcon className="size-4" aria-hidden />
          </div>
          <p className="text-sm font-medium">No links yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">Add your shop, latest video, newsletter or anything you want people to find.</p>
          <Button size="sm" variant="secondary" className="mt-4" onPress={add}>
            <Plus className="size-4" aria-hidden />
            Add your first link
          </Button>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {links.map((link, index) => {
            const label = link.title.trim() || `link ${index + 1}`;
            return (
              <li
                key={link.key}
                className={`rounded-xl border border-border p-3 transition-opacity sm:p-4 ${link.isActive ? "" : "bg-default/40"}`}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    isRequired
                    maxLength={LINK_TITLE_MAX}
                    value={link.title}
                    onChange={(title) => update(link.key, { title })}
                    isInvalid={Boolean(errors[`link:${link.key}:title`])}
                    autoFocus={link.key === focusKey}
                  >
                    <Label>Title</Label>
                    <Input placeholder="My latest video" />
                    <FieldError>{errors[`link:${link.key}:title`]}</FieldError>
                  </TextField>
                  <TextField
                    isRequired
                    value={link.url}
                    inputMode="url"
                    maxLength={URL_MAX}
                    onChange={(url) => update(link.key, { url })}
                    isInvalid={Boolean(errors[`link:${link.key}:url`])}
                  >
                    <Label>URL</Label>
                    <Input placeholder="example.com/page" autoCapitalize="none" spellCheck={false} />
                    <FieldError>{errors[`link:${link.key}:url`]}</FieldError>
                  </TextField>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Switch size="sm" isSelected={link.isActive} onChange={(isActive) => update(link.key, { isActive })}>
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                        <span className="text-sm text-muted">{link.isActive ? "Visible" : "Hidden"}</span>
                      </Switch.Content>
                    </Switch>
                    {link.id ? (
                      <Chip size="sm" variant="soft">
                        {link.clicks.toLocaleString("en-US")} {link.clicks === 1 ? "click" : "clicks"}
                      </Chip>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Move ${label} up`}
                      isDisabled={index === 0}
                      onPress={() => move(index, -1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Move ${label} down`}
                      isDisabled={index === links.length - 1}
                      onPress={() => move(index, 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${label}`}
                      className="text-danger"
                      onPress={() => onChange(links.filter((l) => l.key !== link.key), [])}
                    >
                      <TrashBin className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {atLimit ? <p className="mt-3 text-xs text-muted">You&apos;ve reached the limit of {MAX_LINKS} links.</p> : null}
    </EditorSection>
  );
}
