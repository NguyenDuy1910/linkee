# Linkee.bio — implementation plan

## Observed codebase (2026-11-03)

The `linkee/` working directory was **empty**: no source, git history, database,
migrations, Docker files, CI, screenshots or docs. Neighbouring repositories in the
workspace (`BoMesh`, `engrisk`, `homelab`) contain no Linkee references. There is no
existing auth, billing, customer data, or public URL structure to preserve, so this is a
greenfield build. The canonical public URL shape for a link-in-bio product
(`https://linkee.bio/<slug>`) is adopted so future imports of existing pages keep URLs.

## Reuse

Nothing to reuse in-repo. Reused from the ecosystem instead of hand-rolling:

| Concern | Choice |
| --- | --- |
| App + API | Next.js 16 App Router (route handlers + server actions), TypeScript |
| UI | HeroUI v3 (`@heroui/react`, `@heroui/styles`), Tailwind v4, `@gravity-ui/icons` |
| DB | PostgreSQL 16, Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`) |
| Auth | Auth.js v5 (`next-auth@5` beta) Credentials provider, JWT session, scrypt hashes |
| Validation | Zod 4 |
| Images | `sharp` (normalize to JPEG, strip EXIF, read dimensions) |
| AI | OpenRouter Chat Completions over `fetch` (no SDK) |
| Jobs | Postgres `Job` table + in-process worker (`FOR UPDATE SKIP LOCKED`) |

## Key decisions

- **Cache Components disabled.** Every dashboard route is per-user and dynamic; the
  classic dynamic-by-default model is simpler and correct here.
- **Two separate Meta logins, never mixed:**
  - Instagram: *Instagram API with Instagram Login* (`graph.instagram.com`), scopes
    `instagram_business_basic`, `instagram_business_manage_comments`,
    `instagram_business_content_publish`. Professional (Business/Creator) accounts only.
    Long-lived 60-day token, refreshed by the worker.
  - Facebook: *Facebook Login* for Pages (`graph.facebook.com`), scopes
    `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `publish_video`.
    Each selected Page is stored as its own `SocialAccount` with a Page token.
- **Durable background work without new infrastructure:** a `Job` table claimed with
  `SELECT … FOR UPDATE SKIP LOCKED`, started from `instrumentation.ts` inside the Next.js
  Node server (safe with multiple instances). Heartbeat row gates the Auto-reply toggle.
  Used for: publishing targets, Instagram auto-replies, token refresh.
- **Webhooks:** signature verified (`X-Hub-Signature-256`), comment upserted by unique
  Instagram comment ID (idempotent), auto-reply job enqueued with a unique `dedupeKey`,
  `200` returned immediately. No OpenRouter call in the request.
- **AI cost control:** suggestions only on explicit click, cached per comment +
  settings hash, short prompt (comment + caption excerpt + brand settings), low
  `max_tokens`, reasoning disabled by default, per-minute + daily quotas from plan.
- **Entitlements:** `User.plan` (`FREE`/`PRO`). PRO unlocks AI and publishing. No payment
  gateway (none existed); `scripts/set-plan.ts` flips plans for operators.
- **Media:** local disk (`MEDIA_DIR`, Docker volume) + `MediaAsset` rows; public
  capability URLs `/media/<random key>` that Meta can fetch over HTTPS.

## Files / modules

```
app/                      routes (landing, login/signup, dashboard/*, [slug], go/, media/, api/)
app/dashboard/*/actions.ts server actions per section
components/{layout,bio,social,comments,publishing}/
lib/db.ts env.ts auth.ts session.ts password.ts crypto.ts plans.ts jobs.ts worker.ts media.ts
lib/bio.ts                themes, slug rules
lib/social/{meta,instagram,facebook,tokens}.ts
lib/ai/{openrouter,replies}.ts
prisma/schema.prisma + migrations/
scripts/set-plan.ts       operator utility
tests/                    vitest unit + fixture tests
Dockerfile, docker-compose.yml, .env.example, README.md
```

## Phase order

0. Bootstrap: Next + HeroUI + Prisma + Auth.js + env validation + Compose; lint/typecheck/build.
1. Link in Bio: landing, signup/login, dashboard shell, editor + live preview, themes,
   public page, click counter.
2. Instagram connection + Inbox: OAuth, token storage/refresh, sync, webhooks, manual reply.
3. OpenRouter replies: settings, suggestions (cached), usage + quotas, guarded auto-reply.
4. Post to All: uploads, composer, per-destination validation, worker publishing, retry.
5. Production finish: gating, polish, security review, docs, Docker, smoke tests.
