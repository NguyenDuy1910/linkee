# Linkee — product flows

How the screens connect. Route names match the preview (`ux-preview.html#/…`) and map to production
routes: `#/app/page` → `/dashboard/my-page`, `#/app/inbox` → `/dashboard/inbox`,
`#/app/post` → `/dashboard/publish`, `#/app/settings` → `/dashboard/settings`, `#/<slug>` → `/<slug>`.

## Site map

```mermaid
flowchart LR
  Landing["Landing #/"] -->|Claim username| Signup["Sign up"]
  Landing --> Login["Log in"]
  Signup --> Welcome["Onboarding (3 steps)"]
  Welcome --> Live["Your page is live"]
  Live --> Page
  Login --> Page
  subgraph Workspace
    Page["My Page"]
    Inbox["Inbox"]
    Post["Publish"]
    Settings["Settings"]
  end
  Page -->|View page| Public["Public page /slug"]
  Public -->|Edit page (owner)| Page
  Unclaimed["Unclaimed /slug"] -->|Claim it| Signup
```

## 1. First visit → live page

```mermaid
flowchart TD
  A[Landing: type username] --> B{Available?}
  B -- taken --> B1[Inline: taken · suggestion] --> A
  B -- reserved / invalid --> B2[Inline error] --> A
  B -- yes --> C[Sign up: username prefilled]
  C --> D{Valid?}
  D -- no --> D1[FieldErrors, focus first] --> C
  D -- email exists --> D2[Error + toast: Log in instead] --> L[Log in]
  D -- yes --> E[Onboarding 1: photo, name, bio]
  E --> F[2: theme + font]
  F --> G[3: first link, URL → auto title]
  G -->|Finish or Skip| H[Your page is live: Copy link]
  E & F & G -->|Skip setup| P[My Page + setup checklist]
  H --> P
```

Screens: Landing → Sign up → Onboarding ×3 → Success → My Page. Minimum effort: 1 field on landing,
3 on sign up, then Continue ×2 + Finish.

## 2. Returning creator updates the page

```mermaid
flowchart TD
  L[Log in] --> P[My Page]
  P --> A[Add link: paste URL] --> T[Title auto-fills] --> S1[Row added + flash]
  P --> R[Reorder: drag grip / ↑↓ / menu]
  P --> V[Toggle visibility]
  P --> X[Delete] --> U[Toast: Undo]
  S1 & R & V & X --> D[Save bar appears]
  D -->|Save / ⌘S| OK[Saved toast · public page updated]
  D -->|Discard| UN[Toast: Undo]
```

The preview updates live throughout; only Save publishes. Unsaved edits survive switching tabs.

## 3. Answer comments

```mermaid
flowchart TD
  I[Inbox] --> C{Instagram connected?}
  C -- no --> CN[Connect primer → Instagram OAuth] --> I
  C -- needs reconnect --> RB[Banner · reply disabled] --> RC[Reconnect] --> I
  C -- yes --> O[First comment open]
  O --> S{Pro?}
  S -- no --> UP[Suggest reply → Upgrade dialog]
  S -- yes --> G[Suggest reply → streaming draft]
  G -- fails --> GE[Alert: write your own / retry]
  G --> E[Edit draft]
  O --> W[Write own reply]
  E & W -->|Send / ⌘↵| SENT[Reply sent] --> N{More to reply?}
  O -->|Skip| SK[Toast: Undo] --> N
  N -- yes --> O2[Next comment opens, reply focused] --> S
  N -- no --> Z[You're all caught up]
```

Done tab: replied comments (labeled Written by you / AI-assisted / Auto-reply) and skipped ones (Move back to inbox).

## 4. Post to Instagram and Facebook

```mermaid
sequenceDiagram
  actor U as Creator
  participant C as Composer
  participant IG as Instagram
  participant FB as Facebook Page
  U->>C: Destinations (all connected pre-selected)
  U->>C: Add photos/video (upload progress), caption
  C-->>U: Live checks per network + preview
  U->>C: Publish to 2 places
  par
    C->>IG: publish
    IG-->>C: Published
  and
    C->>FB: publish
    FB-->>C: Failed (rate limited)
  end
  C-->>U: Per-destination status · Retry on Facebook
  U->>C: Retry
  FB-->>C: Published
  C-->>U: Your post is live · Create another post
```

History rules:
- **Failed:** the row has a Retry button.
- **Unconfirmed Instagram:** a "Check first" menu with three options: Open Instagram profile, "It's there — mark as published", or "Not there — publish again" (that one asks for confirmation).

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
  S[Connect: Inbox empty state · Publish › Add account · Settings › Connections] --> LIM{Under plan limit?}
  LIM -- no --> LD[Account limit dialog]
  LIM -- yes --> P[Linkee primer: what Linkee can do]
  P -->|Continue| C[Instagram / Facebook consent screen]
  C -->|Allow, professional account| F[Finishing… → connected toast]
  C -->|Facebook: pick Pages| F
  C -->|Cancel or close| X["Toast: connection was cancelled. Nothing was connected."]
  C -->|Personal Instagram account| E[Toast: switch to a Professional account, then connect again]
  F --> I[Inbox fills with comments / Publish gains destinations]
```

Each Facebook Page becomes its own connection. Reconnect uses the same path from the warning banner.

## 6. Plan upgrade

Any locked action (Suggest reply, Publish, AI settings, Plan) opens one **Upgrade to Linkee Pro** dialog:
what Pro adds, "online checkout isn't available yet", **Contact us to upgrade** (copies the support email).
An operator then switches the account to Pro (`npm run plan:set`).

## 7. Account and page settings

| Action | Path | Guard |
|---|---|---|
| Change page address | Settings › Account › Page address → Save address | Live availability; dialog: old link stops working |
| Hide / show page | Settings › Account switch | Visitors see "This page isn't available"; owner sees a "Hidden" chip |
| Connect another account | Settings › Connections, Publish › Add account, Inbox empty state | Plan account limit dialog |
| Disconnect | Connections row menu | Dialog with consequences |
| Log out | Avatar menu | — |

## State transitions

```mermaid
stateDiagram-v2
  direction LR
  state "Comment" as CM {
    [*] --> New
    New --> Replied: Send / auto-reply
    New --> Skipped: Skip
    Skipped --> New: Move back / Undo
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
