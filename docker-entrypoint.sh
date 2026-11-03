#!/bin/sh
# Apply pending migrations (Prisma takes an advisory lock, so replicas are safe), then
# start the server. Retries briefly while Postgres restarts. RUN_MIGRATIONS=false skips.
set -e
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  attempt=1
  until (cd /opt/migrate && node node_modules/prisma/build/index.js migrate deploy); do
    if [ "$attempt" -ge 5 ]; then
      echo "migrations failed after $attempt attempts" >&2
      exit 1
    fi
    attempt=$((attempt + 1))
    sleep 5
  done
fi
exec "$@"
