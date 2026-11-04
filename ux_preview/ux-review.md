# Linkee — UX review

## Opening the preview

- **Live:** https://linkee-preview.bodangdiet.org (homelab, behind Cloudflare Access). See *Deploy* below.
- **Local:** open `ux-preview.html` directly in a browser (double-click works; no server, build or install).
- Fonts load from Google Fonts when online; offline it falls back to the system font.
- The preview opens as **Maya, a Pro creator with a busy account**, and every form is **prefilled with
  sample data** (sign up, log in, onboarding, Add link, new social icons, a draft in New post,
  preselected files in the file picker). Clicking is enough to see every result; typing is optional.
- **Prototype** (one dashed button, bottom left) is the only prototype tooling, styled to look different
  from the product. Its panel switches scenarios, jumps to any screen, simulates errors and resets, and
  holds **Explore all actions**, which opens the **Action Explorer** (also `?` anywhere): every action in
  the product, grouped by screen and searchable. Each action has a detail page (what happens, why it's
  designed that way, states, HeroUI components, production file) and can be:
  - **Played as a demo** — the scenario is set up, each step is spotlighted with a caption, and the demo
    clicks/types for you. Auto-play, pause, next step, restart; **Play all** per screen or everything.
  - **Tried yourself** — same setup, spotlight on where to start, and it notices when you've done it.
- State lasts for the browser session (sessionStorage). **Prototype → Reset** starts over.

| Scenario | What it shows |
|---|---|
| Returning creator · Pro (default) | Busy page, an Inbox of posts with 12 people commenting (comments, DMs, one person who can't be messaged privately, spam marked "Skipped"), Instagram + Facebook connected, a ready New post draft, posts incl. a failed and an unconfirmed one |
| Returning creator · Free | Same data; Write with AI, Reply to all, auto-reply and New post are gated |
| Connection expired | Instagram needs reconnecting: banners, disabled reply, Reconnect flow |
| Brand-new visitor | Landing → sign up → 2-step onboarding → My Page with the one-time welcome notice |

Error toggles: **AI suggestion fails** (single drafts and Reply to all), **Facebook publish fails**. Typing
`wrong` as the password on Log in shows the credentials error. **Simulate a comment** (From: new person /
new person with messages off / an existing one · Post · Text) drops a comment into the Inbox and shows a
"New comment from X" toast with Open.

### Simulated outside world

Everything that happens outside Linkee is mocked in detail and labeled **Simulated** (with a fake
browser address bar), so reviewers never mistake it for Linkee UI:

| Moment | What you see |
|---|---|
| Connect / reconnect Instagram | Linkee's permission primer → Instagram's consent screen (account, permissions, Allow / Cancel, “Not you?” → personal account) → “Finishing…” → connected. Cancel and personal-account errors use production's exact copy. |
| Connect Facebook Pages | Facebook's Page chooser; each selected Page becomes its own connection and destination |
| Visitor taps a link | `/go/<id>` counts the click (+1 shown), 302 to the creator's site |
| Open a conversation's post on Instagram (post card in the thread) | The post with the comment highlighted and replies in place |
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
| `scripts/views-*.js`, `scripts/app.js` | Screens, router, app shell, Prototype panel |
| `scripts/build-assets.mjs` | `node ux_preview/scripts/build-assets.mjs` regenerates both generated files |
| `scripts/mocks.js` | Simulated Meta consent screens, Instagram/Facebook views, link redirect, file picker |
| `scripts/tour.js`, `scripts/tour-catalog.js` | Action Explorer: player (spotlight, captions, autoplay) and the catalog of scripted actions |

Icons: the brief suggested Lucide, but the production app uses `@gravity-ui/icons`, which is also
HeroUI's own icon set, so the preview uses it too. That keeps the design and the code consistent.

## Screen inventory

| # | Screen | Route | Key states shown |
|---|---|---|---|
| 1 | Landing | `#/` | Claim username: empty / available / taken (with suggestion) / reserved / invalid; signed-in CTA |
| 2 | Sign up | `#/signup?u=` | Prefilled username, live availability, inline validation, pending, "email already has an account" |
| 3 | Log in | `#/login` | Missing fields, wrong credentials alert, pending |
| 4 | Onboarding | `#/welcome` | 2 steps (pick a look → first link) with live preview, Skip for now, Back, URL validation, auto-title; Finish lands on My Page |
| 5 | My Page | `#/app/page` | Page is the editor: every part shows a pencil and opens one sheet (dialog on desktop, bottom sheet on phones): Profile (photo change/remove + Undo, name, bio), Edit link (title, URL, Show on page, position ↑/↓, clicks, Delete + Undo), Add link (URL → auto title), Social icons (rows with ↑ ↓ ×, dashed Add row with every network), Design (template carousel, font samples in your name, button shape/style, Solid/Gradient background swatches + custom, Cancel/Save). Edits are a draft: "Unpublished changes" · Discard (Undo) · Publish under the page. Welcome notice, hidden links dimmed, drag / Alt+↑/↓ reorder with Undo, link limit, hidden-page chip |
| 6 | Inbox · posts and comments | `#/app/inbox` (`?post=<id>` selects a post) | Page head: "@handle · N waiting across your posts · Auto-reply on/off", refresh (1 new comment + Open / "You're up to date"), primary "New post" (Free: locked → Upgrade). No accounts → "Your posts and their comments, together" with Connect Instagram / Connect a Facebook Page. Posts rail (thumbnail, caption, one line: N waiting / publishing / "<network> needs a look" / date; phones: thumbnail strip with count badges); "No posts yet" + New post. Selected post: your avatar + handle + time, image (opens on Instagram), caption, ✓ per network with inline Retry / Check profile · It's there · Publish again (confirm); Facebook-only post note. "Comments · N waiting" with "Reply to all N" as a blue text action (Pro, 2+ waiting in view; Free: lock → Upgrade); underlined category text tabs (All + categories present, with counts; empty filter → Show all). Comments Instagram-style: "username text", blue dot when waiting, text actions time · category (tap → inline choice, "Moved to X" + Undo) · Reply · Skip ("Skipped"); replies and DMs nested; the comment being answered lightly highlighted with "Replying". Reply bar pinned under the comments: "Replying to user · Message privately" / "Messaging user privately · Reply publicly instead" (no link when messaging isn't allowed), "AI draft" chip, ×; your avatar, rounded input pre-filled with the AI draft (Pro, streamed), sparkle (Write with AI / Try another; Free: lock), blue "Post" / "Send" (⌘↵); "Replace your draft?" Keep mine · Replace; AI failed alert; "Reply posted" / "Message sent" / "Skipped — no reply needed" + Undo; next waiting comment highlighted with its draft; "All caught up on this post" + next-post button; J/K; reconnect banner. Reply to all: drafts written one by one as your nested replies (editable, Leave out / Include), bottom bar "N replies ready · M left out" with Cancel / Post N replies, AI failure + try again (written drafts kept), "N replies posted" |
| 6b | Inbox · New post | `#/app/inbox?new=1` (old `#/app/post` redirects here) | Opens in the right pane (close × returns to the post). No connected destination, destination toggles, post card as editor (swipeable photo carousel with remove / move earlier per slide and an "Add more" tile, caption typed in the card, Instagram/Facebook tabs switch the look), live per-network problems, media upload progress, bottom bar "Draft saved" + "Publish to N places"; publishing creates the post and selects it in the rail ("Your post is live" / "Published, with one issue") |
| 7 | Settings | `#/app/settings` | Page address change (Save address appears on change) + confirm, page public/hidden, connections (direct "Instagram" / "Facebook Page" connect buttons, needs reconnecting, "Disconnect" button per account + confirm, account limit dialog, "N of M accounts"), AI tone/language/About you/skip words, auto-reply opt-in dialog, usage meters, Free AI upsell, plan row |
| 8 | Public page | `#/<slug>` | Theme rendering, link click counted, owner "Edit page", hidden page (owner chip / visitor "not available") |
| 9 | Unclaimed page | `#/<unknown>` | "linkee.bio/x isn't taken yet" → Claim it, or "not available" for taken/reserved |
| — | Overlays | — | Connect/Reconnect primer, Upgrade, Disconnect, Change address, Auto-reply opt-in, Publish again, account menu (modals only for confirmations and outside-world handoffs) |

## Navigation structure

- **Top bar (≥768px):** logo · My Page · Inbox (badge = comments waiting) · Settings, then the
  avatar menu (identity + Log out). Copying the page link lives on My Page only. There is no Publish item:
  publishing is Inbox › New post.
- **Bottom tab bar (<768px):** the same three destinations with icons and labels.
- No dashboard and no nesting deeper than one level. Settings is one single-column scrolling page
  (no section nav). The Inbox has no tabs: a posts rail and the selected post.
- Each screen has one primary action: Go to your page / Create my page / Continue / Add link / Post /
  Publish to N places / Save. On My Page, the primary action is Publish under the page; each sheet's one full-width button (Done / Add link / Save) closes it. The
  Inbox page head's primary action is New post; the reply bar's is Post (Send for private, Post N replies
  during Reply to all).

## Screen-by-screen decisions

**Landing.** One promise ("One link. All of you."), one button (Go to your page → Sign up) and a top bar
with only the logo and Log in (Dashboard when signed in). Beside it, three real creator pages rendered by the
product's own renderer; the address above types itself, and dots (or a tap on a side phone) bring another
forward. Auto-advance pauses on hover/focus and is off with reduced motion. Below: "Questions, answered." —
four disclosures (get a page, who it's for + plans, editing, deleting data). The footer links Contact,
Terms, Privacy, Delete your data and Instagram; the three legal pages are short plain text.

**Sign up.** Username first — it's the product's identity. Availability is checked while typing; a taken
name offers a one-click "Try …" suggestion. Errors appear inline under each field (HeroUI FieldError) and focus moves to the
first invalid field. No password-strength meter; auth forms sit on the page without a card frame.

**Onboarding.** Two steps (pick a look → add your first link) with a live phone preview, Back / Continue /
Finish and "Skip for now" top right. Finish goes straight to My Page, where a one-time welcome notice
("Your page is live…") offers Copy link. Photo and bio are edited later on the page itself.

**My Page.** The page is the editor, following the stakeholder concept. Above the page: the address
(opens the public page), Copy, a "Hidden" chip when the page is hidden, and Design. Every editable part
shows a pencil — the photo, each link, the social icons — and the dashed "+ Add" sits under the links;
tapping the name or bio also works. Tapping opens one small sheet for that part: a centered dialog on
desktop, a bottom sheet with a grab handle on phones, closed by one full-width button (Done / Add link /
Save), Esc or tapping outside. The page behind updates live while you type.

- **Profile:** photo with "Change photo" and "Remove" (Undo toast), Name, Bio with counters.
- **Edit link:** Title, URL (invalid → inline error, sheet stays open), "Show on page" switch, "Position N of
  M" with ↑/↓ and the click count, "Delete link" (Undo toast).
- **Add link:** URL first, title auto-fills; new links land at the bottom, right above "+ Add", with a flash.
- **Social icons:** one row per icon (field · ↑ · ↓ · ×) and a dashed Add row with every network left.
- **Design:** template carousel of mini pages in your own name and photo (‹ n / 6 ›), your name in each
  font, button shape and style, Background with Solid / Gradient swatches, "Template default" and a custom
  color; text and buttons adjust for contrast. Cancel reverts, Save keeps.

Edits are one page-wide draft, like production: under the page, "Unpublished changes" · Discard (with
Undo) · Publish; with nothing to publish it reads "Everything is live" and Publish is off. On phones that
row floats above the tab bar. Visitors see the last published page. Links reorder by dragging
(press-and-hold on touch), Alt+↑/↓ (announced to screen readers) or ↑/↓ in the link's sheet; each move
offers Undo. Hidden links stay on the page, dimmed with an eye-slash. The page footer reads "Get yours
like <name>".

**Visible choices (stakeholder request).** Every clickable choice is on screen; nothing hides behind a
menu, "…" or "add" step. Menus remain only for the account (avatar) menu in the top bar.

**Inbox (organized around posts).** Comments only make sense next to the post they're about, so the
Inbox is a rail of posts on the left (thumbnail, caption, one line: "N waiting" / publishing / "<network>
needs a look" / date) and the selected post on the right; on phones the rail becomes a horizontal
thumbnail strip with count badges. There are no To reply / Done / Posts tabs: attention shows per comment
("Waiting") and per post ("N waiting"), with the total in the page sub-line ("@handle · N waiting across
your posts · Auto-reply on/off") and the nav badge. The Inbox opens on the post with the newest waiting
comments.

*The selected post.* Mirrors an Instagram post header: your avatar + handle + time, the image (opens the
post on Instagram), the caption, then ✓ per network with inline fixes (Retry; Check profile / It's there /
Publish again, which confirms so posts don't get duplicated).

*Comments.* "Comments · N waiting" with "Reply to all N" as a blue text action, and underlined category
text tabs (All · Interested · Questions …, only categories present, with counts). Then that post's
comments only, waiting first, Instagram-style: "**username** text" with a blue dot while waiting, and under
it Instagram-style text actions: time · category · Reply · Skip. There are no buttons inside comment
cards. Tapping the category opens an inline choice to correct it (if the active tab would hide it,
"Moved to X" + Undo). Replies and DMs nest underneath. Three concepts stay separate: event type, intent
(Interested, Questions, Feedback, Other) and attention (Waiting / handled). Handled = replied (publicly or
privately) or Skipped; a new comment from someone handled makes them Waiting again.

*Replying.* One reply bar is pinned under the comments, like Instagram's "Add a comment…". The comment
being answered is lightly highlighted and shows "Replying". The bar's top line says "Replying to user ·
Message privately" (or "Messaging user privately · Reply publicly instead"; the link is absent when
Instagram doesn't allow messaging the person), with an "AI draft" chip and × to stop replying. Below it:
your avatar, a rounded input already holding the AI draft for Pro (streamed, editable), a sparkle icon
(Write with AI / Try another) and a blue "Post" ("Send" for private). Drafts are kept per comment and mode.
Write with AI never overwrites typed text and asks "Replace your draft with a suggestion?" first. Skip
(under the comment) marks it "Skipped" with a "Skipped — no reply needed" toast and Undo. Post (⌘↵) moves
to the next waiting comment, whose draft is already in the bar. When a post is cleared: "All caught up on
this post" and a button to the next post with waiting comments. Sent replies keep an "AI-assisted" /
"Auto-reply" label. J/K moves between comments. Free: the input is empty and the sparkle shows a lock. On
phones the bar floats above the tab bar. Rationale: fewer visible buttons, actions where Instagram users
expect them, and one input means one place to look.

*Reply to all.* With 2+ people waiting in the current view, "Reply to all N" (Pro) has AI write a
personal draft for each waiting comment, one by one, shown as your nested reply under each comment
(editable, with "Leave out" / "Include"). A bottom bar reads "N replies ready · M left out" with Cancel and
"Post N replies"; posting puts each reply under that person's comment ("N replies posted"), and left-out
comments stay Waiting. If AI fails, the bar says "AI didn't respond. Write them yourself, or try again.",
and drafts already written or typed are kept. On phones the bar floats above the tab bar.

*Keyword Auto-message (removed).* Earlier rounds let each post auto-message people who commented a
keyword. The stakeholder removed it to keep the Inbox about people, not rules; it can come back later as a
separate feature if validated.

*New post.* Opens in the same right pane (× closes it); there is no separate Publish page and old
`#/app/post` links redirect here. Destinations are toggle pills, all connected accounts selected by
default. The Instagram/Facebook post card is the editor: photos sit in a swipeable carousel inside the
card (each slide has remove and move-earlier, the last tile is "Add more"), the caption is typed directly
in the card, and Instagram/Facebook tabs switch the look.
Checks run live, use the production rules and list only problems. The bottom bar shows "Draft saved" and
"Publish to 2 places", disabled with the reason visible above it. Publishing creates the post right away
and selects it in the rail; each network updates live and failures get an inline Retry. Free: "New post"
is shown locked and opens the upgrade dialog.

**Settings.** One single-column page: Account, Connections, AI replies, Plan. "Save address" appears only
after the address changes. Connections has direct "Instagram" and "Facebook Page" connect buttons and a
"Disconnect" button on each account (confirmed in a dialog);
rows say "Needs reconnecting" in text. Tone is a segmented control with the chosen tone's description.
Plan is one row with "Upgrade to Pro" or "Contact support". Changes that break things (page address,
disconnect, turning on auto-reply) confirm in a dialog that states the consequence. The auto-reply dialog
lists exactly what it never answers.

## HeroUI component mapping

All markup uses HeroUI v3 class names and state attributes compiled from `@heroui/styles`, so each element
maps one-to-one to a `@heroui/react` component.

| Preview element | HeroUI component (`@heroui/react`) | Notes |
|---|---|---|
| Buttons (primary/secondary/ghost/danger, sm/md/lg, icon-only, pending) | `Button` (`variant`, `size`, `isIconOnly`, `isPending`, `fullWidth`) | Pending = spinner + label, width locked |
| Text inputs, URL input with `linkee.bio/` prefix | `TextField` + `Label` + `Input` / `InputGroup` + `Description` + `FieldError` | FieldError uses `data-visible` like HeroUI |
| Bio, caption, About you | `TextField` + `TextArea` | Character counter in the description row |
| Font / button shape / fill / tone / Instagram–Facebook look on the post card | `Tabs` (segment style) | Used as a radio group; production could use `ToggleButtonGroup` with selection |
| Category correction under a comment (tap category → inline choice: Interested · Question · Feedback · Other) | `ToggleButtonGroup` / `RadioGroup` styled as text | `role="radiogroup"` in the preview; appears inline only after the tap |
| Category filter above the comments (All · Interested · Questions …, with counts) | `Tabs` (underlined, text-only) | Only categories present on the post |
| Posts rail (desktop list; phone thumbnail strip with count badges) | `ListBox` (single selection) + `Badge` | Row line: N waiting / publishing (spinner) / "<network> needs a look" / date |
| Selected post head (your avatar + handle + time, image, caption, ✓ per network) | `Avatar` + text + `Chip` + `Button` (Retry, Check profile, It's there, Publish again) | Mirrors an Instagram post header; inline fixes next to the network |
| New post card editor (carousel, caption in place) | Product-only card + `TextArea` + icon `Button`s | Per-slide remove / move earlier, "Add more" tile |
| Comments with nested replies | Product-only list (Instagram-style) + `Avatar` + text links (Reply, Skip, category) | Blue dot = waiting; the comment being answered is highlighted with "Replying"; no buttons inside comment cards |
| Reply bar pinned under the comments | `TextField` + rounded `Input` / `TextArea` + `Avatar` + `Chip` ("AI draft") + icon `Button` (sparkle) + text `Button` (blue "Post" / "Send") + `Link` (Message privately / Reply publicly instead) + icon `Button` (×) | One input; "Replace your draft?" confirm is inline, not a modal; floats above the tab bar on phones |
| Reply to all: nested draft replies and the bottom bar | `TextArea` (as your nested reply) + text `Button` (Leave out / Include) + sticky action bar (Cancel, Post N replies) | "Reply to all N" is a text `Button`/`Link` next to the Comments title; `aria-live` status text |
| Waiting counts (rail, "Comments · N waiting", nav) | `Badge` / `Chip` | |
| Link visibility, auto-reply, page public, review toggles | `Switch` | |
| Status labels (Published, Failed, Hidden, Pro…) | `Chip` (`variant="soft"`, `color`) | |
| Avatars | `Avatar` | Initials fallback |
| Banners (reconnect, AI failed, login error) | `Alert` | |
| Dialogs (connect, upgrade, confirmations) | `Modal` / `AlertDialog` | Only for confirmations and outside-world handoffs; focus trap, Esc, click-outside, focus restore |
| Editing sheets on My Page (profile, link, add link, social icons, design) | `Modal` (dialog ≥768px, bottom sheet <768px) + `TextField` / `Switch` / `Tabs` / `Button` | One full-width primary button; Esc / tap outside closes; the page behind updates live |
| Account menu (top bar) | `Dropdown` + `Menu` + `MenuItem` | Arrow-key navigation; the only remaining menu |
| Inline network fixes, Settings connect/disconnect, social icon add-platform, next-post button | `Button` (ghost / sm, icon-only for ×) | Shown directly, no menu |
| Toasts with Undo (Skip, category moved, photo / link removed…) and with Open (new comment) | `Toast` (`toast()` with action) | Max 3 visible |
| Cards / sections | `Card` (`Card.Header`, `Card.Content`) | Hair border on top of HeroUI surface shadow |
| Reply language | `Select` | Native `<select>` styled as input in the preview; production should use HeroUI `Select` |
| Usage meters | `ProgressBar` / `Meter` | |
| Upload progress | `ProgressBar` | |

Product-only components (no HeroUI equivalent): phone preview frame, bio page renderer (already exists as
`BioPageView`) with its edit mode (click targets, drag reorder), theme swatch picker, the New post card
editor (IG/FB look, media carousel), welcome notice.

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
- **Motion:** 150–320ms with an ease-out curve. Enter/exit for overlays, inline cards and toasts; a
  highlight flash for newly added links; streaming text for AI. Everything respects
  `prefers-reduced-motion`.

## Interaction behavior

| Pattern | Behavior |
|---|---|
| Save model | My Page: one page-wide draft. Sheets change the draft live; Publish (under the page) puts it live, Discard drops it (Undo). Design has Cancel (reverts the look) and Save. Reorder and delete change the draft with an Undo toast. New post drafts autosave. Reply drafts are kept per comment and per mode, including Reply to all drafts after Cancel. |
| Reversible actions | Remove link, remove photo, drag reorder, remove media, Skip, category correction that hides a comment → immediate, with an Undo toast |
| Irreversible / external | Disconnect, change address, publish again, enable auto-reply → dialog stating the consequence |
| Validation | On submit, plus live where it helps (username availability, URL, caption length, network rules). Focus moves to the first error. |
| Async | HeroUI pending buttons; skeleton shimmer and a typing indicator for AI; per-destination spinners for publishing |
| Focus & keyboard | Skip link; route change focuses the page H1; dialogs trap and restore focus; in inline fields and cards Enter saves and Esc reverts, and an invalid URL moves focus back to the field; the account menu supports arrow keys; segmented controls and radio groups support ←/→; Alt+↑/↓ on a focused link moves it (saved, announced in a live region); Inbox J/K moves between comments on the post and ⌘↵ posts; the reply bar input is focused when you choose Reply |
| Connect flow | A primer dialog lists what Linkee can do, then hands off to the network (simulated) |

## Empty, error and success states

| Area | Empty | Error | Success |
|---|---|---|---|
| Links | Canvas shows "+ Add" and "+ Social icons"; one-time welcome notice | Invalid URL (sheet stays open with inline error), missing title, title too long, 50-link limit | Flash highlight on a new link, "Unpublished changes" + Publish, "Your page is updated" + View, Undo toasts |
| Inbox | Not connected → "Your posts and their comments, together" + Connect; "No posts yet" + New post; "No comments yet"; Facebook-only post note; "All caught up on this post" + next-post button; "You're all caught up" in the sub-line; empty category tab → Show all | AI failed alert (write your own / try again); Reply to all: "AI didn't respond. Write them yourself, or try again." (drafts kept); reconnect banner + disabled reply; no "Message privately" link when messaging isn't allowed; rail "<network> needs a look" | "Reply posted" / "Message sent" / "N replies posted"; "Skipped — no reply needed" / "Moved to X" + Undo; next waiting comment highlighted with its draft in the bar; "1 new comment" + Open |
| New post | No accounts → Inbox connect empty state; Free → locked New post → Upgrade; empty post card with "Add photos or a video" | Network rule problems; rate-limited Facebook → failed + inline Retry on the post; unconfirmed Instagram → Check profile / It's there / Publish again | "Draft saved"; the new post is selected in the rail with live waiting → publishing… → ✓; "Your post is live" / "Published, with one issue" |
| Settings | No accounts row | Username taken/reserved/invalid, account limit dialog ("Disconnect one, or upgrade for more"), oversized About you | Toasts for each saved change |
| Public | Preview placeholder "Your links will appear here" | Unclaimed / unavailable / hidden page | — |
| Auth | — | Field errors, wrong credentials, existing email | My Page welcome notice |

## Mobile responsiveness strategy

- **≥1024px:** My Page shows the full page with inline cards and the Design panel in place; Inbox shows
  the posts rail beside the selected post.
- **≤900px:** the posts rail becomes a horizontal thumbnail strip with count badges above the selected
  post and its comments (no list ↔ detail switch, no back arrow).
- **<768px:** bottom tab bar (My Page · Inbox · Settings) with Inbox badge; My Page is the full-bleed page
  with the same inline cards (no overlays); toasts sit above the tab bar; press-and-hold reorders links;
  the landing hero stacks above the example phones; hover-only tools (carousel slide remove/move, avatar ×) are always
  visible on touch; the New post carousel swipes; the reply bar and the Reply to all bar float above the
  tab bar.
- Everything was checked at 1440×900, 820×1180 and 390×844.

## Assumptions requiring validation

1. Pro price shown on the landing page (**$12/month**) is a placeholder. There is no payment provider;
   the upgrade path is "contact us".
2. Dropping the Home dashboard: check with real users that per-link clicks on My Page are enough
   (no trend charts).
3. Two-step onboarding vs. landing straight in the editor: measure completion and time to first share.
4. Default-selecting every connected destination in New post: risky for users with several Pages; may
   need "remember last selection".
5. Moving to the next waiting comment (with its draft ready) after Send / Skip suits high-volume
   creators; low-volume users may prefer staying on the comment they just answered.
6. Upgrade copy and the support email (`hello@linkee.bio`) are placeholders.
7. Instagram professional-account requirement and Meta permission wording in the primer need legal/App
   Review sign-off.
8. Moving page address and visibility out of the editor into Settings (production keeps them in the editor).
9. Per-edit publishing (each Done or leaving a field publishes that piece) vs. production's page-wide
   draft + Save: confirm creators don't miss reviewing several changes before they go live.
10. Intent categories (Interested, Questions, Feedback, Other) and the category in each comment's meta
    line: confirm creators trust automatic categories and find the chips without onboarding.
11. Removing keyword Auto-message: check whether creators with many "price?"-style comments are served
    well enough by AI drafts and Reply to all, before considering it again as a separate feature.
12. Showing every choice directly (text actions, tabs, inline links) instead of menus: check the comment
    actions, the reply bar and the post head stay calm on 390px screens and with long category names or handles.
13. Publishing inside the Inbox (New post) instead of its own page: confirm creators find "New post"
    without a nav item.
14. No global list of waiting comments: validate that creators don't miss comments spread across posts;
    today the rail counts, the "N waiting across your posts" total and the nav badge carry it, and a cleared
    post points to the next one.
15. Auto-drafting on open: confirm creators read and edit the draft rather than sending it unchanged.
16. Reply to all: confirm creators review each draft (rather than sending all unread) and that "Leave
    out" is enough control; check the threshold of 2+ waiting.
17. "Skip" (meta "Skipped") is understood as "no reply needed", not "later".
18. Instagram-style text actions (Reply · Skip, tap the category) instead of buttons: confirm creators
    discover Skip and category correction, and that one pinned reply bar is clear about who they're
    answering ("Replying to user", highlight).

## Prototype-only vs. future backend work (Inbox, AI replies)

**Implemented in the preview (mocked):**
- Conversations and events live in client state (`L.makeState`), persisted in sessionStorage
  (`linkee-ux-preview-v6`); nothing reaches Instagram.
- Intent comes from a rule-based classifier (`L.classify`) standing in for AI.
- AI drafts (`L.suggestFor`) are canned, streamed text; no model call. A draft is written as soon as a
  waiting comment expands (Pro), once per comment and mode, and each one counts against the daily
  suggestion quota (200/day), including drafts the creator never sends. Reply to all uses one suggestion
  per drafted comment (drafts already written or typed are reused).
- Private messaging eligibility is a per-person `dm` flag; Private is disabled with the reason when it's off.
- New comments arrive via Refresh and the "Simulate a comment" panel.

**Required / recommended for production:**
- Instagram webhooks for comments (and messages) to create conversations in real time; no polling.
- Send manual "Private" messages via the Instagram **Private Replies** API: one private reply per
  comment, within 7 days of the comment. Requires `instagram_manage_messages` and App Review; later
  follow-ups depend on the person replying (24-hour window, human-agent tag up to 7 days) — derive the
  Private eligibility from these rules instead of mocking it.
- Replace the rule-based classifier with an AI classifier (keep "by you" corrections as feedback), and the
  mock drafts with real AI suggestions under the existing Pro limits.
- Reply to all: cap the batch size and show the remaining daily quota before drafting (e.g. "Uses 8 of
  your 192 suggestions left today"); post the replies with per-item status and retry, respecting
  Instagram rate limits.
- Store conversations and drafts server-side (not sessionStorage); sync Waiting / handled across devices.
- Auto-drafting costs AI quota per comment opened. Recommended: draft lazily (only after the comment has
  been open for a moment or the reply input is focused), cache drafts server-side per comment, and don't
  count unsent drafts against the creator's visible quota — or pre-draft in a cheap batch for waiting
  comments only.
- An aggregate "waiting" count per post and per account from the backend (rail counts, header total, nav
  badge) rather than computing it client-side.

## Recommended improvements before production

1. Port the IA change: remove `/dashboard` Home; land on My Page with the one-time welcome notice; keep
   the Inbox badge in nav.
2. Make `components/bio/editor` edit inline on the page itself: name/bio typed in place, tap-avatar photo
   change with an × remove (Undo), in-place link / social icons cards (add-platform buttons shown) and a
   Design panel with color inputs shown (Done/blur saves, Esc/Cancel reverts, quiet
   "✓ Saved"), drag reorder that saves with Undo, Alt+↑/↓ keyboard reorder announced to screen readers.
3. Inbox organized around posts: posts rail (phones: thumbnail strip with counts) and the selected post
   (Instagram-style header) with its comments only, waiting first, Instagram-style: "username text", blue
   dot when waiting, text actions time · category (tap to correct) · Reply · Skip (+ Undo), no buttons in
   comment cards; underlined category tabs; no To reply / Done / Posts tabs; attention per comment and per
   post plus header total and nav badge. One reply bar pinned under the comments ("Replying to user ·
   Message privately", AI draft chip, ×; avatar, input pre-filled with the AI draft — lazy/cached, see
   above — sparkle, Post / Send); ⌘↵ posts and highlights the next waiting comment; "All caught up on this
   post" → next post. "Reply to all N" text action with nested reviewable drafts, Leave out and one Post N
   replies (capped, quota shown). J/K. Persistent "AI-assisted" label on sent replies. No "…" menu.
4. Merge `/dashboard/publish` into `/dashboard/inbox`: nav My Page · Inbox · Settings; page-head "New
   post" opening in the right pane; redirect the old route. New post: the IG/FB post card is the editor
   (carousel, caption in place, network tabs); show `lib/publishing-rules.ts` checks live; name
   destinations on the button; publishing creates the post and selects it in the rail with live
   per-network status and inline Retry / Check profile · It's there · Publish again (with warning).
5. Settings: direct "Instagram" / "Facebook Page" connect buttons and a per-account "Disconnect" button.
6. Use HeroUI `Select` for reply language and `ToggleButtonGroup` for segmented choices where selection
   semantics matter.
7. Add a password reset / email verification flow (not in the app today; the preview deliberately omits it).
8. Rate-limit login and surface lockout copy; add account deletion for privacy compliance.
9. Run a 5–6 person usability test on journeys 1, 3 and 4 in `product-flow.md` before building.
10. Port the visual pass: secondary field variants on cards, tertiary for neutral buttons, counters on the
    label row, capped pill radius and the refined link button in `components/bio/bio-page-view.tsx`, and
    the real-width scaled phone preview in `components/bio/phone-frame.tsx`.
