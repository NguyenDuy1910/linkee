# Linkee — product flows

How the screens connect. Route names match the preview (`ux-preview.html#/…`) and map to production
routes: `#/app/page` → `/dashboard/my-page`, `#/app/inbox` → `/dashboard/inbox` (the preview's Inbox › New
post and Posts replace production's `/dashboard/publish`), `#/app/settings` → `/dashboard/settings`,
`#/<slug>` → `/<slug>`. Old `#/app/post` links redirect to Inbox › New post (`#/app/inbox?new=1`).

## Site map

```mermaid
flowchart LR
  Landing["Landing #/"] -->|Go to your page| Signup["Sign up"]
  Landing -->|Log in| Login["Log in"]
  Landing -->|Footer| Legal["Terms · Privacy · Delete your data"]
  Signup --> Welcome["Onboarding (2 steps)"]
  Welcome -->|Finish or Skip for now| Page
  Login --> Page
  subgraph Workspace
    Page["My Page"]
    Inbox["Inbox: posts rail · selected post + its comments · New post"]
    Settings["Settings"]
  end
  Page -->|View page| Public["Public page /slug"]
  Public -->|Edit page (owner)| Page
  Unclaimed["Unclaimed /slug"] -->|Claim it| Signup
```

## 1. First visit → live page

```mermaid
flowchart TD
  A[Landing: Go to your page] --> C[Sign up: username first]
  C --> B{Username available?}
  B -- taken --> B1[Inline: taken · Try suggestion] --> C
  B -- reserved / invalid --> B2[Inline error] --> C
  B -- yes --> D{Valid?}
  D -- no --> D1[FieldErrors, focus first] --> C
  D -- email exists --> D2[Error + toast: Log in instead] --> L[Log in]
  D -- yes --> E[Onboarding 1: pick a look · theme + font]
  E -->|Continue| G[2: first link, URL → auto title]
  G -->|Back| E
  G -->|Finish| P[My Page + welcome notice: Your page is live · Copy link]
  E & G -->|Skip for now| P
```

Screens: Landing → Sign up → Onboarding ×2 → My Page (welcome notice, shown once). Minimum effort:
1 click on landing, 4 fields on sign up, then Continue + Finish.

## 2. Returning creator updates the page

```mermaid
flowchart TD
  L[Log in] --> P[My Page]
  P --> K[Tap a link's pencil] --> SH[Edit link sheet: title · URL · Show on page · ↑↓ · clicks · Delete]
  P --> A[+ Add] --> AS[Add link sheet: paste URL → title auto-fills]
  SH -->|Done / Enter / Esc| D[Draft updated · Unpublished changes]
  AS -->|Add link| D2[Link added at the bottom + flash] --> D
  SH & AS -->|Invalid URL| ER[Sheet stays open · inline error]
  SH -->|Delete link| X[Removed · Toast: Undo] --> D
  P --> R[Drag a link / Alt+↑↓] --> RO[Moved · Toast: Undo] --> D
  P --> PR[Photo pencil / name / bio] --> PS[Profile sheet: Change photo · Remove · Name · Bio] --> D
  P --> SO[Social icons pencil] --> SS[Rows ↑ ↓ × · Add row with every network] --> D
  P --> DE[Design] --> DS[Templates · fonts · buttons · background] -->|Save| D
  DS -->|Cancel / Esc| RV[Look reverted]
  D -->|Publish| LIVE[Your page is updated · View]
  D -->|Discard| DIS[Back to the live page · Toast: Undo]
```

Every part of the page has a pencil and opens one sheet (dialog on desktop, bottom sheet on phones);
the page behind updates live. Edits stay a draft until Publish under the page.

## 3. Answer comments on a post (Quick Reply + AI draft)

The Inbox is organized around posts. Left: a rail of posts (thumbnail, caption, one line: "N waiting" /
publishing / "<network> needs a look" / date); on phones a horizontal thumbnail strip with count badges.
Right: the selected post and, under it, that post's comments only. There are no tabs: whether someone is
waiting is shown per comment and per post. A comment is one person on one post (their comments and DMs,
and your replies, nested Instagram-style).

```mermaid
flowchart TD
  I[Inbox] --> C{Instagram connected?}
  C -- no --> CN[Connect primer → Instagram OAuth] --> I
  C -- needs reconnect --> RB[Banner · reply disabled] --> RC[Reconnect] --> I
  C -- yes --> P[Post with the newest waiting comments selected in the rail]
  P --> F[Comments · N waiting · Reply to all N · category text tabs: All + categories present]
  F --> A[First waiting comment highlighted · Replying]
  A --> BAR[Reply bar under the comments: Replying to user · Message privately · ×]
  BAR --> PRO{Pro?}
  PRO -- yes --> G[AI draft streams into the input · AI draft chip]
  PRO -- no --> W[Empty input · sparkle locked → Upgrade dialog]
  G -- fails --> GE[Alert: write your own / try again]
  BAR -->|Message privately| PV[Messaging user privately · Reply publicly instead · button says Send]
  BAR -. messaging not allowed .-> NL[No Message privately link]
  PV --> E
  E -->|Sparkle: Write with AI / Try another| T{Input holds your own words?}
  T -- yes --> RP[Replace your draft with a suggestion? Keep mine / Replace]
  RP -- Replace --> G
  RP -- Keep mine --> E
  T -- no --> G
  G & W --> E[Edit in the input]
  E -->|Post / Send · ⌘↵| SENT[Toast: Reply posted / Message sent · handled]
  A -->|Skip under the comment| SK[Toast: Skipped — no reply needed · Undo]
  SENT & SK --> N{Another waiting comment on this post?}
  N -- yes --> A2[Next waiting comment highlighted · its draft is already in the bar] --> E
  N -- no --> Z[All caught up on this post · button: N waiting on the next post]
  Z -->|Click| P2[Next post with waiting comments selected]
```

- Comment, Instagram-style: "**username** text" with a blue dot while waiting; under it text actions:
  time · category · Reply · Skip ("Skipped" once skipped). Replies and DMs nest underneath. Waiting
  comments come first; the rest keep Instagram's order. No buttons inside comment cards.
- Tapping the category opens an inline choice (Interested · Question · Feedback · Other). If the active
  tab would hide the comment, a "Moved to X" toast offers Undo and the next waiting comment is highlighted.
- Reply (or clicking a comment) highlights it with "Replying" and points the one reply bar at it; × stops
  replying. J/K moves between comments; ⌘↵ posts. On phones the bar floats above the tab bar.
- Handled = replied (publicly or privately) or Skipped. Handled comments stay in the list without the blue
  dot; Reply on one still allows a follow-up.

## 3b. Reply to all (Pro)

**Reply to all N** is a blue text action next to the Comments title when 2+ people are waiting in the
current view (respecting the category tab). Free: it's locked and opens the upgrade dialog.

```mermaid
flowchart TD
  B[Reply to all N] --> D[AI drafts a personal reply for each waiting comment, one by one]
  D --> S[Each draft shown as your nested reply under the comment · editable · Leave out / Include]
  D -- AI fails --> FL[Bar: AI didn't respond · try again · drafts already written or typed are kept]
  FL -->|try again| D
  S --> BAR[Bottom bar: N replies ready · M left out]
  BAR -->|Cancel| X[Batch closed · drafts kept · first waiting comment highlighted]
  BAR -->|Post N replies| P[Each reply posted under that person's comment]
  P --> T[Toast: N replies posted]
  P --> LO[Left-out comments stay Waiting]
```

Each drafted comment uses one AI suggestion from the daily quota. On phones the bar floats above the tab
bar.

## 3c. Reopen

```mermaid
flowchart LR
  H[Handled comment] -->|Same person comments again| W[Waiting · unread · post count +1]
  SK[Skipped] -->|Undo in toast| W
  H -->|Reply · post a follow-up| H
```

## 4. Post to Instagram and Facebook (Inbox › New post)

Publishing lives in the Inbox: the page head has a primary **New post** button (Free: locked, opens the
upgrade dialog). New post opens in the same right pane where the selected post usually is.

```mermaid
sequenceDiagram
  actor U as Creator
  participant C as New post (right pane)
  participant P as Selected post (right pane)
  participant IG as Instagram
  participant FB as Facebook Page
  U->>C: New post (page head)
  U->>C: Destinations (all connected pre-selected) · Instagram / Facebook look
  U->>C: Add photos/video in the card carousel (upload progress, Add more), type caption in the card
  C-->>U: Live problems per network (if any) · bottom bar: Draft saved
  U->>C: Publish to 2 places
  C->>P: Post created at once · selected in the rail
  par
    P->>IG: publish (waiting → publishing…)
    IG-->>P: ✓ Instagram
  and
    P->>FB: publish (waiting → publishing…)
    FB-->>P: Failed (rate limited)
  end
  P-->>U: Rail: "Facebook needs a look" · inline Retry next to Facebook
  U->>P: Retry
  FB-->>P: ✓ Facebook
```

There is no results card or posts list elsewhere: the post in the rail is the record. Inline fixes next
to each network under the post:
- **Failed:** Retry.
- **Instagram didn't confirm:** Check profile, It's there (mark as published), Publish again (asks for confirmation).

### 4b. The selected post

```mermaid
flowchart TD
  R[Rail row: thumbnail · caption · N waiting / publishing / network needs a look / date] --> SP[Selected post]
  SP --> IMG[Image → opens the post on Instagram]
  SP --> NET[Your avatar + handle + time · caption · ✓ per network · inline Retry / Check profile · It's there · Publish again]
  SP --> CM[Comments · N waiting · Reply to all N → flows 3 and 3b]
```

A Facebook-only post says "This post is only on Facebook. Linkee shows Instagram comments."

## 5. Turn on auto-reply

```mermaid
flowchart LR
  A[Inbox header: Auto-reply off] --> S[Settings › AI replies]
  S --> K[Tone · language · About you · words to skip] --> SV[Save]
  S --> T[Toggle auto-reply] --> D[Dialog: what it never answers · 100/day]
  D -->|Turn on| ON[Auto-reply on · labeled in Inbox]
  D -->|Cancel| S
```

Gate: Free → AI section shows an upsell; disconnected or broken Instagram disables the toggle.

## 5b. Connect an Instagram account or Facebook Page

```mermaid
flowchart TD
  S[Connect: Inbox empty state · Settings › Connections › Instagram / Facebook Page buttons] --> LIM{Under plan limit?}
  LIM -- no --> LD[Account limit reached dialog: disconnect one, or upgrade for more]
  LIM -- yes --> P[Linkee primer: what Linkee can do]
  P -->|Continue| C[Instagram / Facebook consent screen]
  C -->|Allow, professional account| F[Finishing… → connected toast]
  C -->|Facebook: pick Pages| F
  C -->|Cancel or close| X["Toast: connection was cancelled. Nothing was connected."]
  C -->|Personal Instagram account| E[Toast: switch to a Professional account, then connect again]
  F --> I[Inbox fills with conversations · New post gains destinations]
```

Each Facebook Page becomes its own connection. Reconnect uses the same path from the warning banner.

## 6. Plan upgrade

Any locked action (Write with AI, Reply to all, New post, AI settings, Plan) opens one **Upgrade to Linkee Pro** dialog:
what Pro adds, "online checkout isn't available yet", **Contact us to upgrade** (copies the support email).
An operator then switches the account to Pro (`npm run plan:set`).

## 7. Account and page settings

| Action | Path | Guard |
|---|---|---|
| Change page address | Settings › Account › Page address → Save address | Live availability; dialog: old link stops working |
| Hide / show page | Settings › Account switch | Visitors see "This page isn't available"; owner sees a "Hidden" chip |
| Connect another account | Settings › Connections › "Instagram" or "Facebook Page" button; Inbox empty state | At the plan limit, Connect opens the "Account limit reached" dialog |
| Disconnect | "Disconnect" button on each account row | Dialog with consequences |
| Log out | Avatar menu | — |

## State transitions

```mermaid
stateDiagram-v2
  direction LR
  state "Comment attention" as CV {
    [*] --> Waiting: new comment
    Waiting --> Handled: Post reply / Send private message
    Waiting --> Handled: Skip
    Waiting --> Handled: Reply to all · Post N replies
    Handled --> Waiting: Undo
    Handled --> Waiting: Same person comments again
  }
  state "Destination" as DS {
    [*] --> Pending
    Pending --> Publishing
    Publishing --> Published
    Publishing --> Failed
    Publishing --> Unconfirmed
    Failed --> Publishing: Retry
    Unconfirmed --> Published: Mark as published
    Unconfirmed --> Publishing: Publish again (confirm)
  }
  state "Connection" as CN {
    [*] --> Connected
    Connected --> NeedsReconnect: token expired
    NeedsReconnect --> Connected: Reconnect
    Connected --> [*]: Disconnect
  }
```
