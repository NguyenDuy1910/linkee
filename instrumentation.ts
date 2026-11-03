/**
 * Runs once per Next.js server process. Starts the Postgres-backed job worker (publishing,
 * auto-replies, token refresh, cleanup) in the Node.js runtime unless WORKER_ENABLED=false.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.WORKER_ENABLED === "false") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // Dynamic on purpose: instrumentation is also compiled for the Edge runtime, where the
  // worker's Node-only dependencies (pg, sharp, fs) must not be loaded.
  const { startWorker } = await import("@/lib/worker");
  startWorker();
}
