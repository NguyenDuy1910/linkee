# Linkee — UX review

## Opening the preview

- **Live:** https://linkee-preview.bodangdiet.org (homelab, behind Cloudflare Access). See *Deploy* below.
- **Local:** open `ux-preview.html` directly in a browser (double-click works; no server, build or install).
- Fonts load from Google Fonts when online; offline it falls back to the system font.
- The preview opens as **Maya, a Pro creator with a busy account**, and every form is **prefilled with
  sample data** (claim field, sign up, log in, onboarding, Add link, new social icons, a ready-to-publish
  draft, preselected files in the file picker). Clicking is enough to see every result; typing is optional.
- **Actions** (bottom left, or press `?`) opens the **Action Explorer**: every action in the product
  (68), grouped by screen and searchable. Each action has a detail page (what happens, why it's designed
  that way, states, HeroUI components, production file) and can be:
  - **Played as a demo** — the scenario is set up, each step is spotlighted with a caption, and the demo
    clicks/types for you. Auto-play, pause, next step, restart; **Play all** per screen or everything.
  - **Tried yourself** — same setup, spotlight on where to start, and it notices when you've done it.
- **Review** (dashed, bottom left) switches scenarios, jumps to any screen and simulates errors. Both
  buttons are prototype tooling, styled to look different from the product.
- State lasts for the browser session (sessionStorage). **Review → Reset** starts over.

| Scenario | What it shows |
|---|---|
| Returning creator · Pro (default) | Busy page, 6 comments to reply, Instagram + Facebook connected, a ready draft, post history incl. a failed and an unconfirmed post |
| Returning creator · Free | Same data; AI suggestions, auto-reply and Publish are gated |
| Connection expired | Instagram needs reconnecting: banners, disabled reply, Reconnect flow |
| Brand-new visitor | Landing → sign up → onboarding → workspace with setup checklist |

Error toggles: **AI suggestion fails**, **Facebook publish fails**. Typing `wrong` as the password on
Log in shows the credentials error.

### Simulated outside world

Everything that happens outside Linkee is mocked in detail and labeled **Simulated** (with a fake
browser address bar), so reviewers never mistake it for Linkee UI:

| Moment | What you see |
|---|---|
| Connect / reconnect Instagram | Linkee's permission primer → Instagram's consent screen (account, permissions, Allow / Cancel, “Not you?” → personal account) → “Finishing…” → connected. Cancel and personal-account errors use production's exact copy. |
| Connect Facebook Pages | Facebook's Page chooser; each selected Page becomes its own connection and destination |
| Visitor taps a link | `/go/<id>` counts the click (+1 shown), 302 to the creator's site |
| Open a comment on Instagram | The post with the comment highlighted and replies in place |
| View a published post | Instagram post or Facebook Page post as published |
| Unconfirmed Instagram post | The profile grid with the post highlighted → mark as published |
| Add photos or a video | The device file picker with valid files, a 9:16 screenshot (too tall for the feed), a 1.2 GB video and a PDF (rejected at upload with production's rules) |

## Deploy

The preview ships on its own, with no environment and no backend:

| Piece | Where |
|---|---|
| Image | `ux_preview/Dockerfile`: `nginxinc/nginx-unprivileged` (non-root, port 8080, `/healthz`), static files only |
| CI/CD | `.github/workflows/ux-preview.yml`: on `ux_preview/**` changes to `main` → `ghcr.io/nguyenduy1910/linkee-ux-preview:sha-<7>` → homelab `bump-image` (stack `linkee-preview`) |
| Homelab | `homelab/stacks/linkee-preview/compose.yaml`: Traefik `linkee-preview.<BASE_DOMAIN>`, read-only filesystem, no env |

App releases (`release.yml`) ignore `ux_preview/**`, so preview changes never rebuild or redeploy the app.
Local: `docker build -t linkee-ux-preview ux_preview && docker run -p 8080:8080 linkee-ux-preview`.

## Files

| File | Purpose |
|---|---|
| `ux-preview.html` | Entry point |
| `styles/heroui.css` | HeroUI v3 component CSS compiled from the app's own `@heroui/styles` (generated) |
| `styles/app.css` | Linkee brand tokens (same values as `app/globals.css`) + layouts and product-only pieces |
| `scripts/icons.js` | SVG sprite: `@gravity-ui/icons` (HeroUI's icon set, used by the app) + the app's brand marks (generated) |
| `scripts/ui.js` | Helpers that emit HeroUI markup (Button, Chip, TextField, Tabs, Switch, Alert, Modal, Dropdown, Toast) + bio-page renderer |
| `scripts/data.js` | Product constants mirrored from production code + mock personas |
| `scripts/views-*.js`, `scripts/app.js` | Screens, router, app shell, review panel |
| `scripts/build-assets.mjs` | `node ux_preview/scripts/build-assets.mjs` regenerates both generated files |
| `scripts/mocks.js` | Simulated Meta consent screens, Instagram/Facebook views, link redirect, file picker |
| `scripts/tour.js`, `scripts/tour-catalog.js` | Action Explorer: player (spotlight, captions, autoplay) and the catalog of 68 scripted actions |

Icons: the brief suggested Lucide, but the production app uses `@gravity-ui/icons`, which is also
HeroUI's own icon set, so the preview uses it too. That keeps the design and the code consistent.

## Screen inventory

| # | Screen | Route | Key states shown |
|---|---|---|---|
| 1 | Landing | `#/` | Claim username: empty / available / taken (with suggestion) / reserved / invalid; signed-in CTA |
| 2 | Sign up | `#/signup?u=` | Prefilled username, live availability, inline validation, password strength, pending, "email already has an account" |
| 3 | Log in | `#/login` | Missing fields, wrong credentials alert, pending |
| 4 | Onboarding | `#/welcome` | 3 steps with live preview, skip per step / skip all, URL validation, auto-title, "Your page is live" |
| 5 | My Page | `#/app/page` | Setup checklist (0–4/4, dismiss), empty links, add/edit/hide/reorder/delete+undo, link limit, profile photo add/remove, social icons, themes/fonts/shape/style, custom colors, unsaved/saving/saved, hidden-page chip, mobile Edit/Preview |
| 6 | Inbox | `#/app/inbox` | Not connected, To reply / Done, all caught up, comment detail, AI generating / suggested / failed, Free lock, sending, auto-advance, skipped + move back, reconnect banner, refresh (new comment / up to date), mobile list→detail |
| 7 | Publish | `#/app/post` | Free gate, no accounts, destination toggles, media upload progress/reorder/remove+undo, live per-network checks, IG/FB preview, publishing → published / failed + retry, history with failed + unconfirmed options |
| 8 | Settings | `#/app/settings` | Page address change + confirm, page public/hidden, connections (connected / needs reconnect / disconnect confirm / account limit), AI tone/language/About you/skip words, auto-reply opt-in dialog, usage meters, Free AI upsell, plan comparison |
| 9 | Public page | `#/<slug>` | Theme rendering, link click counted, owner "Edit page", hidden page (owner chip / visitor "not available") |
| 10 | Unclaimed page | `#/<unknown>` | "linkee.bio/x isn't taken yet" → Claim it, or "not available" for taken/reserved |
| — | Overlays | — | Connect/Reconnect primer, Upgrade, Disconnect, Change address, Auto-reply opt-in, Publish again, account menu, row menus |

## Navigation structure

- **Top bar (≥768px):** logo · My Page · Inbox (badge = comments to reply) · Publish · Settings, then
  page-URL pill (copies the link) and avatar menu (View my page, Copy page link, Settings, Log out).
- **Bottom tab bar (<768px):** the same four destinations with icons and labels; URL pill collapses to an icon.
- No dashboard and no nesting deeper than one level. Settings is one scrolling page with a sticky section
  nav, which becomes a horizontal scroller on mobile.
- Each screen has one primary action: Claim / Create my page / Continue / Add link (+ Save when dirty) /
  Send reply / Publish / Save.

## Screen-by-screen decisions

**Landing.** The claim field is the hero CTA, so the first action is also the first step of sign up. The
phone shows a real page rendered by the same renderer as the product. Two floating cards hint at the
Inbox and Publish without extra sections. Three feature cards each use a tiny real UI excerpt instead
of icons. Pricing is honest: Pro says "Start free, upgrade anytime".

**Sign up.** Username first, because it's what they just typed and it's the product's identity. Availability
is checked while typing. Errors appear inline under each field (HeroUI FieldError) and focus moves to the
first invalid field.

**Onboarding.** Three short steps (who you are → look → first link), each skippable, with a live phone
preview. It ends on a success screen whose primary job is getting the link into a bio (Copy).

**My Page.** Links come first: they're the most frequent edit and carry the value (clicks). The live preview
is sticky beside the form. Changes are drafts until Save; a dark floating save bar appears only when
something changed (⌘S works). Reordering works by drag on the grip, by keyboard (focus grip + ↑/↓, announced
to screen readers) or from the row menu. Visibility is a switch per row; hidden links keep their data.
Deleting gives an Undo toast. Pasting a URL auto-fills the title. Custom colors sit behind a disclosure.

**Inbox.** Two panes on desktop. The first comment is open on arrival, so replying takes zero navigation
clicks. "Suggest reply" streams text into the editable box, labeled as an AI suggestion; sent replies keep
an "AI-assisted" / "Auto-reply" / "Written by you" label. After Send or Skip the next comment opens and the
reply box is focused. Keyboard: J/K to move, ⌘↵ to send. Skip has Undo; Done items can move back. The
auto-reply status is always visible in the header and links to its settings.

**Publish.** Destinations are toggle pills, all connected accounts selected by default. Checks run live and
use the production rules. The button names the outcome ("Publish to 2 places") and is disabled with the
reason visible above it. After publishing, each destination reports its own status and retry. History keeps
a "check before retrying" state for unconfirmed Instagram posts, so posts don't get duplicated.

**Settings.** One page, four sections. Changes that break things (page address, disconnect, turning on
auto-reply) confirm in a dialog that states the consequence. The auto-reply dialog lists exactly what it
never answers.

## HeroUI component mapping

All markup uses HeroUI v3 class names and state attributes compiled from `@heroui/styles`, so each element
maps one-to-one to a `@heroui/react` component.

| Preview element | HeroUI component (`@heroui/react`) | Notes |
|---|---|---|
| Buttons (primary/secondary/ghost/danger, sm/md/lg, icon-only, pending) | `Button` (`variant`, `size`, `isIconOnly`, `isPending`, `fullWidth`) | Pending = spinner + label, width locked |
| Text inputs, URL input with `linkee.bio/` prefix | `TextField` + `Label` + `Input` / `InputGroup` + `Description` + `FieldError` | FieldError uses `data-visible` like HeroUI |
| Bio, caption, About you | `TextField` + `TextArea` | Character counter in the description row |
| Font / button shape / style / To reply–Done / Edit–Preview / IG–FB preview | `Tabs` (segment style) | Used as a radio group; production could use `ToggleButtonGroup` with selection |
| Link visibility, auto-reply, page public, review toggles | `Switch` | |
| Status labels (Published, Failed, Hidden, Pro…) | `Chip` (`variant="soft"`, `color`) | |
| Avatars | `Avatar` | Initials fallback |
| Banners (reconnect, AI failed, login error, skipped) | `Alert` | |
| Dialogs (connect, upgrade, confirmations) | `Modal` / `AlertDialog` | Focus trap, Esc, click-outside, focus restore |
| Account menu, row menus, add icon, add account | `Dropdown` + `Menu` + `MenuItem` | Arrow-key navigation |
| Toasts with Undo | `Toast` (`toast()` with action) | Max 3 visible; stacks above the save bar |
| Cards / sections | `Card` (`Card.Header`, `Card.Content`) | Hair border on top of HeroUI surface shadow |
| Reply language | `Select` | Native `<select>` styled as input in the preview; production should use HeroUI `Select` |
| Keyboard hints | `Kbd` | Hidden on touch layouts |
| Usage meters | `ProgressBar` / `Meter` | |
| Upload progress | `ProgressBar` | |

Product-only components (no HeroUI equivalent): phone preview frame, bio page renderer (already exists as
`BioPageView`), link row, theme swatch picker, media tray, IG/FB post preview, setup checklist, save bar.

## Visual design principles

- **Tokens:** HeroUI default light theme. Linkee overrides only `--accent` (indigo `oklch(0.52 0.2 277)`)
  and `--radius` (0.625rem), exactly as `app/globals.css` does. Type is Geist.
- **Hierarchy:** 26/600 page titles with tight tracking, 15–18/600 section titles, 14/400 body, 12–13
  muted meta. Numbers use tabular figures.
- **Surfaces:** gray `--background`, white cards with a hair border plus `--surface-shadow`. Overlays use
  `--overlay-shadow`. No gradients in product chrome; color comes from the creator's page and the
  network marks.
- **Fields on cards** use HeroUI's `secondary` variants (`input--secondary`, `textarea--secondary`,
  `input-group--secondary`): a soft gray fill gives every field a clear shape on white. Character
  counters sit on the label row and only appear while typing or when over the limit.
- **Neutral actions** use HeroUI `tertiary` (gray, foreground text). HeroUI `secondary` colors its text
  with the accent, which made every secondary action look like a link.
- **Phone previews** render the bio page at a real 375px phone width and scale it into the frame, so the
  preview is an exact miniature (same line breaks as on a phone). An iOS-style status bar stays pinned
  with a theme-tinted blur, so content scrolls under it instead of colliding with the Dynamic Island.
- **Bio link buttons**: 50–56px tall, 500 weight, balanced wrapping, a soft shadow, lift on hover. Pill
  corners are capped at 25px so a title that wraps to two lines stays a soft rectangle instead of a blob
  (production's `BioPageView` uses an uncapped 9999px radius — port the cap).
- **Restraint:** one accent; semantic colors only for status (success, warning, danger); no charts. The
  only stats are per-link clicks and daily AI usage, both decision-relevant.
- **Motion:** 150–320ms with an ease-out curve. Enter/exit for overlays, toasts and the save bar; a
  highlight flash for newly added links; streaming text for AI. Everything respects
  `prefers-reduced-motion`.

## Interaction behavior

| Pattern | Behavior |
|---|---|
| Save model | Edits update the preview instantly; the public page changes only on Save. The save bar shows Discard (with Undo) and Save. ⌘S saves. Drafts survive switching tabs. |
| Reversible actions | Delete link, remove media, skip comment, discard changes → immediate, with an Undo toast |
| Irreversible / external | Disconnect, change address, publish again, enable auto-reply → dialog stating the consequence |
| Validation | On submit, plus live where it helps (username availability, URL, caption length, network rules). Focus moves to the first error. |
| Async | HeroUI pending buttons; skeleton shimmer and a typing indicator for AI; per-destination spinners for publishing |
| Focus & keyboard | Skip link; route change focuses the page H1; dialogs trap and restore focus; menus support arrow keys; segmented controls support ←/→; grip ↑/↓; Inbox J/K and ⌘↵ |
| Connect flow | A primer dialog lists what Linkee can do, then hands off to the network (simulated) |

## Empty, error and success states

| Area | Empty | Error | Success |
|---|---|---|---|
| Links | "Add your first link" with action | Invalid URL, missing title, title too long, 50-link limit | "Link added", flash highlight, "Saved" |
| Inbox | Not connected → Connect; "You're all caught up"; "Nothing here yet" (Done) | AI failed alert; reconnect banner + disabled reply | "Reply sent" + next comment opens |
| Publish | No accounts → connect both; empty preview hint | Network rule errors, rate-limited Facebook with Retry, unconfirmed Instagram with options | Per-destination Published, "Your post is live" |
| Settings | No accounts row | Username taken/reserved/invalid, account limit, oversized About you | Toasts for each saved change |
| Public | Preview placeholder "Your links will appear here" | Unclaimed / unavailable / hidden page | — |
| Auth | — | Field errors, wrong credentials, existing email | Onboarding success screen |

## Mobile responsiveness strategy

- **≥1024px:** two-column editors (form + sticky preview) and the two-pane Inbox.
- **768–1023px:** single column; My Page gets an Edit / Preview segmented switch; the Inbox becomes
  list → detail at ≤900px.
- **<768px:** bottom tab bar with Inbox badge; the save bar sits above it and toasts above that; the
  landing claim field stacks; Settings section nav becomes horizontal; keyboard hints are hidden; hover-only
  tools (media remove/reorder) are always visible on touch.
- Everything was checked at 1440×900, 820×1180 and 390×844.

## Assumptions requiring validation

1. Pro price shown on the landing page (**$12/month**) is a placeholder. There is no payment provider;
   the upgrade path is "contact us".
2. Dropping the Home dashboard: check with real users that per-link clicks on My Page are enough
   (no trend charts).
3. Onboarding with three skippable steps vs. landing straight in the editor: measure completion and time to
   first share.
4. Default-selecting every connected destination in Publish: risky for users with several Pages; may
   need "remember last selection".
5. Auto-opening the next comment after Send/Skip suits high-volume creators; low-volume users may prefer
   staying on the thread.
6. Upgrade copy and the support email (`hello@linkee.bio`) are placeholders.
7. Instagram professional-account requirement and Meta permission wording in the primer need legal/App
   Review sign-off.
8. Moving page address and visibility out of the editor into Settings (production keeps them in the editor).

## Recommended improvements before production

1. Port the IA change: remove `/dashboard` Home; land on My Page with the setup checklist; keep the
   Inbox badge in nav.
2. Add the floating save bar + ⌘S + Undo patterns to `components/bio/editor`; keep its explicit save model.
3. Inbox: auto-open the first comment, auto-advance after send/skip, J/K/⌘↵, streaming suggestion into
   the textarea, persistent "AI-assisted" label on sent replies.
4. Publish: show `lib/publishing-rules.ts` checks live above the button; name destinations on the button;
   unconfirmed-post menu ("It's there" / "Publish again" with warning).
5. Use HeroUI `Select` for reply language and `ToggleButtonGroup` for segmented choices where selection
   semantics matter.
6. Add a password reset / email verification flow (not in the app today; the preview deliberately omits it).
7. Rate-limit login and surface lockout copy; add account deletion for privacy compliance.
8. Run a 5–6 person usability test on journeys 1, 3 and 4 in `product-flow.md` before building.
9. Port the visual pass: secondary field variants on cards, tertiary for neutral buttons, counters on the
   label row, capped pill radius and the refined link button in `components/bio/bio-page-view.tsx`, and
   the real-width scaled phone preview in `components/bio/phone-frame.tsx`.
