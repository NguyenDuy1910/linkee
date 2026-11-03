# syntax=docker/dockerfile:1
# One image runs Linkee: Next.js web + in-process job worker. On start it applies pending
# Prisma migrations (advisory-locked, safe with several replicas), then serves on :3000.
# Deployed by the homelab repo (stacks/linkee); images are built by .github/workflows/release.yml.

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM deps AS builder
COPY . .
# Placeholders only so env validation passes while prerendering; real values are runtime env.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    AUTH_SECRET="build-time-placeholder-not-a-secret" \
    TOKEN_ENCRYPTION_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" \
    WORKER_ENABLED="false" \
    npm run build

# Just the Prisma CLI + migrations, for `prisma migrate deploy` at container start.
FROM base AS migrator
WORKDIR /opt/migrate
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund prisma@7.10.1 dotenv@18.0.9 \
 && npm cache clean --force
COPY prisma.config.ts ./
COPY prisma ./prisma

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 MEDIA_DIR=/data/media
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs \
 && mkdir -p /data/media && chown -R nextjs:nodejs /data
COPY --from=migrator --chown=nextjs:nodejs /opt/migrate /opt/migrate
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
USER nextjs
EXPOSE 3000
VOLUME ["/data/media"]
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
