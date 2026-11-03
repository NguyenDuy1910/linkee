# Linkee.bio

Link-in-bio pages, an Instagram comment inbox with on-brand AI replies (OpenRouter), and
"Post to All" for Instagram + Facebook Pages — in one Next.js app with PostgreSQL.

| | |
| --- | --- |
| App + API | Next.js 16 (App Router, route handlers, server actions), TypeScript |
| UI | HeroUI v3 + Tailwind CSS v4, `@gravity-ui/icons` |
| Data | PostgreSQL 16 + Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Auth.js v5 (email + password, JWT session, scrypt hashes) |
| AI | OpenRouter Chat Completions (model via `OPENROUTER_MODEL`) |
| Background work | Postgres `Job` table + worker inside the Next.js server process |
| Media | Local disk volume (`MEDIA_DIR`) + `MediaAsset` rows |

No Redis, queues, object storage or extra services. See `docs/implementation-plan.md` for decisions.

## Quick start (local)

Requirements: Node ≥ 22, Docker.

```bash
cp .env.example .env
# fill AUTH_SECRET and TOKEN_ENCRYPTION_KEY:  openssl rand -base64 32  (twice)
npm install                        # also runs `prisma generate`
docker compose up -d db            # Postgres on localhost:${POSTGRES_PORT:-5432}
npm run db:migrate                 # prisma migrate deploy
npm run dev                        # http://localhost:3000
```

Sign up at `/signup` → you land in the page editor with a live page at `/<username>`.

AI replies and Post to All are Pro features. There is no payment gateway yet; grant Pro with:

```bash
npm run plan:set -- you@example.com PRO      # or FREE
```

> Environment precedence: variables already set in the shell override `.env` (standard
> Next.js behaviour). If `APP_URL` looks wrong at runtime, check your shell environment.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (also starts the job worker) |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest unit + fixture tests (no DB or network needed) |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | Create a new migration during development |
| `npm run plan:set -- <email> <PRO\|FREE>` | Operator: change a user's plan |

## Features and where they live

| Area | Routes | Core code |
| --- | --- | --- |
| Landing, signup, login | `/`, `/signup`, `/login` | `app/page.tsx`, `app/signup`, `app/login`, `lib/auth.ts` |
| Home | `/dashboard` | `app/dashboard/page.tsx` |
| Page editor + live preview | `/dashboard/my-page` | `components/bio/**`, `lib/bio.ts` |
| Public page, click counter | `/<slug>`, `/go/<linkId>` | `app/[slug]`, `app/go` |
| Inbox (comments, AI, replies) | `/dashboard/inbox` | `lib/instagram-comments.ts`, `lib/ai/*` |
| Settings (accounts, AI prefs, usage) | `/dashboard/settings` | `components/social`, `app/dashboard/settings` |
| Post to All | `/dashboard/publish` | `lib/publishing.ts`, `lib/publishing-rules.ts`, `lib/social/*` |
| OAuth | `/api/social/{instagram,facebook}/{connect,callback}` | `lib/social/instagram.ts`, `lib/social/facebook.ts` |
| Webhooks | `/api/webhooks/instagram` | `lib/social/instagram-webhook.ts` |
| Uploads / media | `POST /api/media`, `/media/<key>` | `lib/media.ts` |
| Jobs | — | `lib/jobs.ts`, `lib/worker.ts`, `instrumentation.ts` |

## Plans

| | Free | Pro |
| --- | --- | --- |
| Link-in-bio page, themes, click counts | ✓ | ✓ |
| Connect Instagram / Facebook, Inbox, manual replies | ✓ (3 accounts) | ✓ (10 accounts) |
| AI reply suggestions | — | 200 / day |
| Guarded auto-replies (opt-in) | — | 100 / day |
| AI calls per minute | — | 10 |
| Post to All | — | ✓ |
| Media storage | 50 MB | 2 GB |

Limits live in `lib/plans.ts`. Upgrade CTAs link to `UPGRADE_URL` when set.

## Meta setup checklist

Linkee uses **two separate, official logins** and never mixes their tokens:

| | Instagram | Facebook Pages |
| --- | --- | --- |
| Meta product | Instagram → *API setup with Instagram login* | Facebook Login |
| API host | `graph.instagram.com` | `graph.facebook.com` |
| Scopes | `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_content_publish` | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `publish_video` |
| Token | Instagram user token (60 days, auto-refreshed daily) | Page token (from long-lived user token; no expiry) |
| Env | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | `META_APP_ID`, `META_APP_SECRET` |
| Redirect URI | `${APP_URL}/api/social/instagram/callback` | `${APP_URL}/api/social/facebook/callback` |

1. Create a **Business** type app at <https://developers.facebook.com/apps>.
2. Add **Instagram** → *API setup with Instagram login*. Copy the Instagram App ID/Secret
   (they differ from the Facebook App ID/Secret). Add the Instagram redirect URI under
   *Business login settings*.
3. Add **Facebook Login** (for Pages). Add the Facebook redirect URI under
   *Valid OAuth Redirect URIs*. Copy the App ID/Secret from *App settings → Basic*.
4. **Webhooks** (Instagram product → *Configure webhooks*): callback
   `${APP_URL}/api/webhooks/instagram`, verify token = `META_WEBHOOK_VERIFY_TOKEN`, subscribe
   the `comments` field. Payloads are verified with `X-Hub-Signature-256` using the
   Instagram app secret (the Facebook app secret is also accepted).
5. `APP_URL` must be a **public HTTPS** origin: Meta downloads publishing media from
   `${APP_URL}/media/<key>` and only calls HTTPS webhooks. For local testing use a tunnel
   (e.g. `cloudflared tunnel --url http://localhost:3000`) and set `APP_URL` to it.
6. Development mode: only accounts added as **testers/roles** on the Meta app can connect.
7. Production for other people's accounts requires **App Review** (Advanced Access for every
   scope above, plus webhooks `comments`) and **Business Verification**. Meta also requires
   the app to be **Live** for webhooks.

Provider limitations surfaced in the UI:

- Instagram API with Instagram Login works only for **Professional** (Business or Creator)
  accounts. Personal accounts are rejected with instructions to switch.
- Instagram publishing: JPEG only (uploads are converted), feed aspect ratio 4:5–1.91:1,
  caption ≤ 2,200 chars / 30 hashtags / 20 mentions, carousel ≤ 10 items here, single
  videos are published as Reels, 100 API posts per 24 h. No text-only posts.
- Facebook Pages: text-only, 1–10 photos, or one video (no photo + video mix).
- Accounts linked to a Page that requires Page Publishing Authorization must complete it in Meta.
- Scheduling, Threads, TikTok, YouTube, LinkedIn and X are not implemented ("Coming later").

## OpenRouter

Set `OPENROUTER_API_KEY` (<https://openrouter.ai/keys>). Defaults are budget-oriented:

| Variable | Default | Notes |
| --- | --- | --- |
| `OPENROUTER_MODEL` | `google/gemini-3.1-flash-lite` | Any OpenRouter model id |
| `OPENROUTER_MAX_TOKENS` | `120` | Replies are ≤ 2 short sentences |
| `OPENROUTER_REASONING_EFFORT` | `none` | Disables reasoning tokens; empty = omit |
| `OPENROUTER_TIMEOUT_MS` | `15000` | One retry on 429/5xx/network |

Cost controls: nothing calls OpenRouter when you open or scroll the Inbox; suggestions are
generated on click and cached per comment + settings; prompts contain only the comment,
a caption excerpt and your brand settings; every call (success or failure) is recorded in
`AiUsage` with model, tokens, cost and latency; per-minute and daily quotas come from the plan.

## Auto-replies (off by default)

The per-account switch in Settings is enabled only when the plan includes AI, OpenRouter is
configured, the account is active, webhooks are subscribed, and the worker heartbeat is
fresh. Pipeline: webhook (signature verified) → comment upserted by unique Instagram id →
job enqueued with `dedupeKey ig-auto-reply:<commentId>` → worker runs cheap filters first
(own comment, already replied, older than 24 h, thread replies, links/mention spam, skip
keywords, daily quota, per-minute limit) → OpenRouter → reply sent through the same
duplicate-safe path as manual replies. Replies are retried only after rate-limit errors,
where Meta guarantees nothing was posted.

## Background worker

`instrumentation.ts` starts `lib/worker.ts` in every Node.js server process
(`WORKER_ENABLED=false` disables it). Jobs are claimed with `FOR UPDATE SKIP LOCKED`, so
several instances are safe; crashed jobs are re-queued after 10 minutes; retries use
exponential backoff with a max attempt count. Daily maintenance: Instagram token refresh,
orphaned upload cleanup (24 h), and pruning finished jobs (14 days).

## Deploy (homelab)

Production env, database and the stack live in the **homelab** repo, not here:

| Piece | Where |
| --- | --- |
| App stack (Traefik route `https://linkee.<BASE_DOMAIN>`, media volume `linkee-media`) | `homelab/stacks/linkee/compose.yaml` |
| Database `linkee` + login role `linkee` on the shared `homelab-postgres` | `homelab/stacks/postgres` (`PROJECT_DATABASES`, `postgres-init`) |
| Secrets (`AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY`, `LINKEE_DB_PASSWORD`, Meta, OpenRouter) | `homelab/env.yaml` → sections `stacks/linkee`, `stacks/postgres` |
| Public access (no Cloudflare Access login; Meta must reach `/media` and webhooks) | `homelab/infra/cloudflare/terraform.tfvars` → `public_subdomains` |

Flow: push to `main` here → `.github/workflows/release.yml` runs lint/typecheck/tests,
pushes `ghcr.io/nguyenduy1910/linkee:sha-<7>`, and dispatches `bump-image` to the homelab
repo, which pins the tag in `stacks/linkee/compose.yaml` and deploys. The container applies
pending Prisma migrations on start (`docker-entrypoint.sh`), then serves on port 3000 behind
Traefik; the job worker runs in the same process.

One-time: add repo secret `HOMELAB_DISPATCH_TOKEN` (fine-grained, Contents read/write on
the homelab repo). If the GHCR package is private, the server needs `GHCR_USER`/`GHCR_TOKEN`
(see homelab `docs/setup.md`).

`docker-compose.yml` in this repo is a **local development database only**.

Grant Pro in production (no tsx in the image), on the server:

```bash
docker exec homelab-postgres psql -U <POSTGRES_USER> -d linkee \
  -c "UPDATE \"User\" SET plan = 'PRO' WHERE email = 'you@example.com'"
```

### Backups and scaling

- `homelab-postgres-backup` dumps the `linkee` database nightly and `core/backup` ships
  dumps plus the `linkee-media` volume to R2 (uploaded files are not in the database).
- Keep `TOKEN_ENCRYPTION_KEY` safe and stable: losing or changing it makes stored provider
  tokens unreadable (users would have to reconnect).
- Media on local disk makes this a **single-host** deployment. Running multiple app hosts
  requires shared storage for `MEDIA_DIR`; the job worker itself is multi-instance safe.
- Cloudflare's free plan rejects request bodies over 100 MB, which matches the video upload cap.

## Security notes

- Provider tokens are AES-256-GCM encrypted at rest and never sent to the browser.
- OAuth `state` is HMAC-signed, expires in 10 minutes, and is bound to the signed-in user.
- Every server action / route handler authenticates and owner-scopes its queries.
- Uploads are streamed with a byte cap, type-checked by file signature, images are re-encoded
  (EXIF/location stripped), and served by unguessable key with `nosniff`.
- Link redirects (`/go`) only target stored `http(s)`, `mailto:` or `tel:` URLs.
- Known gaps: no login rate limiting or email verification yet; JWT sessions are not
  revoked on password change (there is no password change UI yet).

## Tests

`npm test` runs pure/fixture tests: token encryption and OAuth state, slug/URL/theme
validation, Instagram webhook signature + payload parsing (fixtures in `tests/fixtures`),
AI prompt/cleanup/spam filters, and per-platform publishing rules + Graph request building.
Real Meta and OpenRouter behaviour needs credentials; see the checklist above.
# linkee
