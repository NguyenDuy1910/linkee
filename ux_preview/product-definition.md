# Linkee — product definition

Source of truth for business rules: the production app in this repo (`lib/bio.ts`, `lib/plans.ts`,
`lib/ai/*`, `lib/publishing-rules.ts`, `prisma/schema.prisma`). This document describes the product the
UX preview (`ux-preview.html`) is designed around. Nothing here adds scope beyond what the app already does.

## Vision and positioning

**One link for everything you make.** Linkee is the calm home base for a solo creator's public presence:
a beautiful link-in-bio page, one inbox for Instagram comments, and one composer that posts to
Instagram and Facebook together.

Positioning: a premium, minimal alternative to link-in-bio tools that stop at the page, and to social
suites that are built for agencies. Linkee is for one person who makes things and posts every week.

## Target users

| Persona | Situation | Needs |
|---|---|---|
| **New creator** (e.g. "Alex", food creator) | Has an Instagram/TikTok bio with one link slot | A good-looking page live in a minute, without design decisions |
| **Busy maker** (e.g. "Maya", ceramicist, Pro) | Sells drops, teaches classes, posts 3–5×/week | Keep links current, answer the same questions in comments quickly, post once to IG + FB |
| **Free user growing** | Page works, comments are piling up | Knows exactly what Pro adds and how to get it |

Shared traits: mobile-first, not technical, impatient with setup, protective of their voice and audience.

## Core value proposition

1. **Live in a minute.** Claim `linkee.bio/you`, pick a look, add a link. The page is live immediately.
2. **Answer people faster, in your own voice.** Every comment in one list; AI drafts a reply you edit
   and approve. Auto-reply exists but is off by default and heavily guarded.
3. **Post once, everywhere.** One caption + media → Instagram and Facebook Pages, with status and retry
   per destination.

## MVP feature boundaries

| Area | In | Out (not in the app; not designed) |
|---|---|---|
| Page | Profile (photo, name, bio), up to 50 links with show/hide + reorder, up to 12 social icons, 6 themes, 4 fonts, 3 button shapes, 3 button styles, custom colors, lifetime click count per link, public page, unclaimed-slug page | Analytics charts, scheduling links, custom domains, multiple pages |
| Inbox | Instagram comments (professional accounts), reply, skip/undo, AI suggestion (Pro), auto-reply per IG account (Pro, off by default), refresh | DMs, other networks' comments, assignment/teams |
| Publish | IG feed post / carousel / Reel, FB Page post (text, photos, or one video), per-destination status + retry, draft save, history | Scheduling, Stories, TikTok/YouTube publishing, analytics |
| Account | Email (read-only), page address change, page visibility (public/hidden), connections (IG + FB Pages), AI usage meters, plan view | Name/password editing, email verification, password reset by email, team seats, deleting the account, token/cost reporting |
| Plans | Free / Pro gates from `lib/plans.ts` | Online checkout (none exists; upgrade is by contacting Linkee) |

Plan limits (from `lib/plans.ts`): Free — page, inbox, 3 accounts, no AI, no publishing. Pro — 200 AI
suggestions/day, 100 auto-replies/day, publishing, 10 accounts.

## Information architecture

Four destinations, no dashboard home. The page is the product, so **My Page is home**.

```
Public
├── Landing (/)                 claim username → Sign up
├── Sign up · Log in
├── Onboarding (3 skippable steps → "Your page is live")
├── Public page (/<slug>)
└── Unclaimed page (/<slug> not taken) → Claim it

Workspace (signed in)
├── My Page      links · profile · social icons · appearance · live preview · setup checklist
├── Inbox        To reply / Done · comment thread · reply composer (AI suggest)
├── Publish      composer · preview · results · recent posts
└── Settings     Account · Connections · AI replies · Plan   (one page, section nav)
```

Global: page URL pill (copy) and account menu (view page, copy link, settings, log out) in the top bar;
bottom tab bar on mobile.

## Key user journeys

1. **First visit → live page:** Landing → claim username → Sign up → Onboarding (photo/name/bio → theme →
   first link) → "Your page is live" → copy link.
2. **Returning maker updates links:** My Page → Add link (paste URL, title auto-fills) → reorder → Save.
3. **Answer comments:** Inbox → first comment already open → Suggest reply → edit → ⌘↵ send → next comment
   opens automatically → "You're all caught up".
4. **Post everywhere:** Publish → destinations pre-selected → add photos → caption → live checks → Publish
   → per-destination status → retry the one that failed.
5. **Turn on auto-reply:** Settings → AI replies → write "About you" → toggle on → confirm guardrails.
6. **Recover a broken connection:** banner in Inbox/Publish/Settings → Reconnect → permission primer → done.
7. **Free → Pro:** any locked action (Suggest reply, Publish, AI settings) → one upgrade dialog → contact.

## Product decisions and rationale

| Decision | Rationale |
|---|---|
| Drop the "Home" dashboard; My Page is the landing screen after login | The production Home only restated stats and a checklist. The editor is where the user always goes next; per-link click counts and the setup checklist moved there. One fewer nav item. |
| Keep production nav labels: My Page, Inbox, Publish, Settings | Reuse existing terminology; "Post to All" stays the feature name inside Publish. |
| Page address and page visibility move from the editor to Settings › Account | Both are rare, high-impact changes (address change breaks shared links). Keeping them out of the editor keeps My Page about content; the hidden state still shows as a chip on My Page and on the public page for the owner. |
| Settings shows AI usage as two daily meters only; production's 30-day requests/tokens/cost are left out | Tokens and cost are operator data, not creator decisions. The daily meters map to the plan limits users actually hit. |
| Explicit Save with a floating save bar (⌘S), not autosave | A public page shouldn't change mid-edit. Live preview shows changes instantly; the public page only updates on Save. Matches the production editor's save model. |
| Unsaved edits survive navigation inside the workspace | Users switch to Inbox mid-edit; losing work is worse than a reminder. The save bar reappears on return. |
| Delete with Undo toast, no confirm dialog (links, media, skip) | Reversible actions shouldn't interrupt. Irreversible ones (disconnect, change page address, publish again) get a dialog. |
| Onboarding is 3 short, skippable steps with a live preview | The "aha" is seeing your page look good. Every step can be skipped; nothing blocks reaching the workspace. |
| Setup checklist on My Page instead of a tour | Progress the user can act on; dismissible; auto-completes from real state. |
| Inbox auto-opens the next comment after send/skip | Inbox zero is the goal; one keystroke per comment. |
| AI suggestion streams into the editable box, labeled "AI suggestion — edit freely" | The user stays the author. Sent replies keep an "AI-assisted" / "Auto-reply" label. |
| Auto-reply confirmation lists the production guardrails verbatim | Trust: users see exactly what is never auto-answered (from `lib/ai/auto-reply.ts`). |
| Pre-permission primer before Meta OAuth | Explains what Linkee can do and the professional-account requirement before leaving the app. |
| Publish shows network rules as live checks, button says where it posts ("Publish to 2 places") | Rules come from `lib/publishing-rules.ts`; errors appear before the click, not after. |
| Unconfirmed Instagram publishes say "Check before retrying" with explicit options | Matches the production retry policy: avoid duplicate posts. |
| Upgrade dialog says checkout isn't available and offers contact | No fake payment flow; mirrors `UPGRADE_MESSAGE`. |
