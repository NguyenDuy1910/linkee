import "server-only";
import { setTimeout as sleep } from "node:timers/promises";
import { handleAutoReply } from "@/lib/ai/auto-reply";
import { beatHeart, claimNextJob, enqueueJob, pruneJobs, recoverStaleJobs, runJob, type JobHandler } from "@/lib/jobs";
import { handleMediaCleanup } from "@/lib/media";
import { handlePublishTarget } from "@/lib/publishing";
import { handleRefreshInstagramTokens } from "@/lib/social/tokens";

const HANDLERS: Record<string, JobHandler> = {
  "post.publishTarget": handlePublishTarget,
  "instagram.autoReply": handleAutoReply,
  "instagram.refreshTokens": () => handleRefreshInstagramTokens(),
  "media.cleanup": () => handleMediaCleanup(),
  "jobs.prune": () => pruneJobs(),
};

/** Daily maintenance; the date-based dedupeKey makes this safe from any number of instances. */
const DAILY = ["instagram.refreshTokens", "media.cleanup", "jobs.prune"] as const;

const POLL_IDLE_MS = 2_000;
const HEARTBEAT_MS = 30_000;
const MAINTENANCE_MS = 10 * 60_000;

const state = globalThis as unknown as { __linkeeWorker?: { stop: () => void } };

/**
 * Starts the in-process worker loop once per Node process (called from instrumentation.ts).
 * Processes one job at a time; publishing and replies are low-volume and rate-limited by Meta.
 */
export function startWorker(): void {
  if (state.__linkeeWorker) return;
  let running = true;
  state.__linkeeWorker = { stop: () => (running = false) };

  let lastHeartbeat = 0;
  let lastMaintenance = 0;

  void (async () => {
    console.info("[worker] started");
    while (running) {
      try {
        const now = Date.now();
        if (now - lastHeartbeat > HEARTBEAT_MS) {
          await beatHeart();
          lastHeartbeat = now;
        }
        if (now - lastMaintenance > MAINTENANCE_MS) {
          await recoverStaleJobs();
          const day = new Date().toISOString().slice(0, 10);
          for (const type of DAILY) await enqueueJob(type, {}, { dedupeKey: `${type}:${day}`, maxAttempts: 2 });
          lastMaintenance = now;
        }
        const job = await claimNextJob();
        if (job) {
          await runJob(job, HANDLERS);
          continue;
        }
      } catch (err) {
        console.error("[worker] loop error:", err instanceof Error ? err.message : err);
      }
      await sleep(POLL_IDLE_MS);
    }
  })();
}
