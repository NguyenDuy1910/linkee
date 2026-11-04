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
2. **Answer people faster, in your own voice.** The Inbox is organized around your posts: pick a post, see
   who's waiting on it, and the reply bar already holds an AI draft you edit and post, publicly or as a
   private message. When several people are waiting, "Reply to all" drafts a personal reply for each to
   review and send together. Auto-reply exists but is off by default and heavily guarded.
3. **Post once, everywhere.** One caption + media → Instagram and Facebook Pages, with status and retry
   per destination.

## MVP feature boundaries

| Area | In | Out (not in the app; not designed) |
|---|---|---|
| Page | Profile (photo, name, bio), up to 50 links with show/hide + reorder, up to 12 social icons, 6 themes, 4 fonts, 3 button shapes, 3 button styles, custom colors, lifetime click count per link, public page, unclaimed-slug page | Analytics charts, scheduling links, custom domains, multiple pages |
| Inbox | Posts rail with waiting counts; the selected post with its Instagram comments shown Instagram-style (comments + DMs per person, nested; professional accounts), intent categories with tap-to-correct and tab filter, per-comment attention (Waiting / handled, Skip + Undo), one pinned reply bar posting publicly or sending a private message, pre-filled with an AI draft (Pro), "Reply to all N" with reviewable AI drafts (Pro), auto-reply per IG account (Pro, off by default), refresh; New post (see Publishing) | Other networks' comments/DMs, assignment/teams, a global cross-post comment list, keyword Auto-message (removed; see decisions) |
| Publishing (Inbox › New post) | IG feed post / carousel / Reel, FB Page post (text, photos, or one video), per-network status + inline fixes on the post, draft save | A separate Publish page, scheduling, Stories, TikTok/YouTube publishing, analytics |
| Account | Email (read-only), page address change, page visibility (public/hidden), connections (IG + FB Pages), AI usage meters, plan view | Name/password editing, email verification, password reset by email, team seats, deleting the account, token/cost reporting |
| Plans | Free / Pro gates from `lib/plans.ts` | Online checkout (none exists; upgrade is by contacting Linkee) |

Plan limits (from `lib/plans.ts`): Free — page, inbox, 3 accounts, no AI, no publishing. Pro — 200 AI
suggestions/day, 100 auto-replies/day, publishing, 10 accounts.

## Information architecture

Three destinations, no dashboard home. The page is the product, so **My Page is home**. The Inbox is
organized around posts: publishing and the comments a post collects live in one place, with no tabs.

```
Public
├── Landing (/)                 One link. All of you. · Go to your page → Sign up · example pages · FAQ
├── Terms · Privacy · Delete your data   (footer; Meta requires Privacy + data deletion to go Live)
├── Sign up · Log in
├── Onboarding (2 steps: pick a look → first link; Skip for now)
├── Public page (/<slug>)
└── Unclaimed page (/<slug> not taken) → Claim it

Workspace (signed in)
├── My Page      the page is the editor: pencil on photo / each link / social icons, dashed + Add → one sheet
│                each (dialog on desktop, bottom sheet on phones) · Design sheet (templates, fonts, buttons,
│                background) · drag to reorder · Unpublished changes · Discard · Publish · welcome notice
├── Inbox        page head: "@handle · N waiting across your posts · Auto-reply on/off" · refresh ·
│                New post (Free: locked)
│                left: posts rail (thumbnail, caption, N waiting / publishing / network needs a look /
│                  date); phones: thumbnail strip with count badges
│                right: selected post (your avatar + handle + time, image → Instagram, caption,
│                  ✓ per network + inline fixes) · Comments · N waiting · Reply to all N (text action) ·
│                  category text tabs · comments, waiting first, Instagram-style ("username text", blue dot
│                  when waiting; time · category · Reply · Skip) · one reply bar pinned under the comments:
│                  "Replying to user · Message privately", AI draft chip, ×; avatar · input · ✨ · Post / Send
│                  or New post (post card editor · checks · Draft saved · Publish to N places)
└── Settings     Account · Connections · AI replies · Plan   (one single-column page)
```

Global: top bar with the three destinations and an account menu (identity, Log out); bottom tab bar on
mobile. Copying the page link lives on My Page.

## Key user journeys

1. **First visit → live page:** Landing → Go to your page → Sign up (username first) → Onboarding (pick a look → first
   link) → My Page with "Your page is live" welcome notice → copy link.
2. **Returning maker updates links:** My Page → + Add (paste URL, title auto-fills) → Add link → drag to
   reorder (Undo) → Publish.
3. **Answer comments:** Inbox → the post with waiting comments is selected; the first waiting comment is
   highlighted ("Replying") and the reply bar under the comments already holds its AI draft → edit → ⌘↵
   Post (or Send, privately) → the next waiting comment is highlighted with its draft ready → "All caught
   up on this post" → button to the next post with waiting comments.
3b. **Answer everyone on a post at once:** Comments title → Reply to all N → AI writes a personal draft,
   shown as your nested reply under each waiting comment, one by one → edit any, "Leave out" some → Post N
   replies → "N replies posted"; the ones left out stay Waiting.
4. **Post everywhere:** Inbox › New post → destinations pre-selected → add photos and type the caption
   directly in the post card (Instagram/Facebook tabs switch the look) → live checks → Publish to N places →
   the new post is selected in the rail with live per-network status → Retry inline on the one that failed.
5. **Turn on auto-reply:** Settings → AI replies → write "About you" → toggle on → confirm guardrails.
6. **Recover a broken connection:** banner in Inbox/Settings → Reconnect → permission primer → done.
7. **Free → Pro:** any locked action (Write with AI, Reply to all, New post, AI settings) → one upgrade dialog → contact.

## Product decisions and rationale

| Decision | Rationale |
|---|---|
| Drop the "Home" dashboard; My Page is the landing screen after login | The production Home only restated stats and a checklist. The editor is where the user always goes next; per-link click counts moved there. One fewer nav item. |
| Nav is My Page, Inbox, Settings; publishing is part of the Inbox (New post); old `#/app/post` links redirect to Inbox › New post | One consistent place for posts and the comments they collect, no page switches. Keeps production labels My Page, Inbox, Settings; "Post to All" stays the feature name for New post. |
| The Inbox is organized around posts: a rail of posts on the left, the selected post with its comments on the right; no To reply / Done / Posts tabs | Comments only make sense next to the post they're about. Attention (waiting vs handled) shows per comment ("Waiting") and per post ("N waiting"), plus the header total and nav badge, instead of separate lists. |
| The comment you're answering is highlighted ("Replying") and the pinned reply bar already holds its AI draft (Pro); posting highlights the next waiting comment with its draft ready; a cleared post points to the next post with waiting comments | Replying becomes read → tweak → post. The creator stays in context; the draft never overwrites typed words. |
| Page address and page visibility move from the editor to Settings › Account | Both are rare, high-impact changes (address change breaks shared links). Keeping them out of the editor keeps My Page about content; the hidden state still shows as a chip on My Page and on the public page for the owner. |
| Settings shows AI usage as two daily meters only; production's 30-day requests/tokens/cost are left out | Tokens and cost are operator data, not creator decisions. The daily meters map to the plan limits users actually hit. |
| The page is the editor, following the stakeholder concept: every part has a pencil and opens one small sheet (dialog on desktop, bottom sheet on phones); edits are one draft until Publish under the page | Tapping the thing you see is the most direct edit, and a sheet with one big button is a familiar phone pattern. The page behind updates live. One page-wide draft matches production and lets creators try things freely; Discard (with Undo) drops it. Delete, reorder and photo removal offer Undo. |
| Delete with Undo toast, no confirm dialog (links, media, Skip) | Reversible actions shouldn't interrupt. Irreversible ones (disconnect, change page address, publish again) get a dialog. |
| Onboarding is 2 short steps (look → first link) with a live preview and "Skip for now" | The "aha" is seeing your page look good. Nothing blocks reaching the workspace; photo and bio are edited on the page itself. |
| The empty canvas guides first steps (+ Add link, + Social icons) plus a one-time welcome notice, instead of a checklist or tour | The page itself shows what's missing; the notice's one job is getting the link into a bio (Copy link). |
| Copy link lives on My Page only; connecting accounts lives in Settings › Connections and the empty states | One entry point per capability keeps the top bar and the Inbox quiet. |
| New post drafts autosave ("Draft saved" in the bottom bar); all connected destinations preselected | Sensible defaults: no Save draft button to remember. |
| Publishing creates the post at once and selects it in the rail; each network updates live (waiting → publishing… → ✓ / failed) and fixes happen inline on the post | No results card or separate posts list: the post is the single record of what happened. |
| Three separate concepts: event type (comment, DM in, public reply, private message, auto-reply), intent (Interested, Questions, Feedback, Other), attention (Waiting / handled) | Each answers a different question (what happened / what they want / do I need to act), so none is overloaded. Under each comment: time · category · Reply · Skip; a blue dot marks Waiting, "Skipped" marks a skip. |
| Attention rules: new comment → Waiting; reply or private message sent → handled; Skip → handled ("Skipped", Undo); a new comment from someone handled → Waiting + unread | The creator only sees what still needs them. |
| Intent is set automatically and corrected in one tap (tap the category under a comment → inline choice: Interested · Question · Feedback · Other); underlined text tabs above the comments filter that post's comments (All + categories present, with counts) | Classification can be wrong; correction is cheap and labeled "by you". |
| Keyword Auto-message is removed from the product (stakeholder decision) | Fewer concepts in the Inbox (no rules, no automation outcomes); answering stays with the creator, made fast by AI drafts and Reply to all. It can come back later as a separate feature if validated. |
| Comments mirror Instagram: "username text", Instagram-style text actions under each comment (time · category · Reply · Skip), no buttons inside comment cards; the comment being answered is lightly highlighted with "Replying" | Fewer visible buttons, and actions sit where Instagram users already expect them. |
| One reply bar pinned under the comments (like Instagram's "Add a comment…"): "Replying to user · Message privately" (or "Messaging user privately · Reply publicly instead"; no link when messaging isn't allowed), an "AI draft" chip and ×; then your avatar, a rounded input pre-filled with the AI draft, a sparkle (Write with AI / Try another) and a blue "Post" ("Send" for private); drafts kept per comment and mode; handled comments can still get a follow-up | One input means one place to look; switching public/private is a text link in context instead of a segmented control. "Skip" replaces "No reply needed": short, and the comment shows "Skipped". |
| "Reply to all N" as a blue text action next to the Comments title (Pro, 2+ waiting in the current view): AI drafts each reply as your nested reply under each comment (editable, "Leave out" / "Include"); one bottom bar "N replies ready · M left out" with Cancel / Post N replies | Busy posts get many similar questions; batching saves time while each reply stays personal and reviewed. Left-out comments stay Waiting; drafts already written or typed are kept if AI fails. |
| Every clickable choice is visible; no menus or "…" to reveal options (category tabs, category under each comment, Reply, Skip, Message privately, Reply to all; inline network fixes on the post; Settings connect/disconnect; avatar photo; social icon platforms; custom colors) | Stakeholder request: no extra click to discover an action. Confirmations stay for irreversible steps (Publish again, Disconnect). |
| New post is edited directly on the Instagram/Facebook preview card | What you edit is what gets posted; no separate form and preview to reconcile. |
| AI drafts stream into the reply input with an "AI draft" chip (tooltip "Written by AI — edit before sending"); the sparkle gives "Try another" for an unedited draft; Write with AI never replaces typed text without asking | The user stays the author and never loses their own words. Sent replies keep an "AI-assisted" / "Auto-reply" label. |
| Auto-reply confirmation lists the production guardrails verbatim | Trust: users see exactly what is never auto-answered (from `lib/ai/auto-reply.ts`). |
| Pre-permission primer before Meta OAuth | Explains what Linkee can do and the professional-account requirement before leaving the app. |
| New post shows network problems as live checks, button says where it posts ("Publish to 2 places") | Rules come from `lib/publishing-rules.ts`; problems appear before the click, not after; when all is fine nothing is shown. |
| Unconfirmed Instagram publishes show Check profile / It's there / Publish again inline on the post | Matches the production retry policy: avoid duplicate posts. |
| Upgrade dialog says checkout isn't available and offers contact | No fake payment flow; mirrors `UPGRADE_MESSAGE`. |
