import "server-only";
import { db } from "@/lib/db";
import { Prisma, type Job } from "@/lib/generated/prisma/client";

/**
 * Durable Postgres-backed jobs. Claimed with FOR UPDATE SKIP LOCKED, so any number of
 * app instances can run the worker safely. Handlers must be idempotent: a job can run
 * again after a crash between the side effect and marking it DONE.
 */

export type JobResult = void | { rescheduleInMs: number };
export type JobHandler = (payload: Prisma.JsonValue, job: Job) => Promise<JobResult>;

/** Throw from a handler to fail the job immediately without retries. */
export class PermanentJobError extends Error {}

export interface EnqueueOptions {
  /** Unique idempotency key; a second enqueue with the same key is a no-op. */
  dedupeKey?: string;
  runAt?: Date;
  maxAttempts?: number;
}

/** Returns false when a job with the same dedupeKey already exists. */
export async function enqueueJob(
  type: string,
  payload: Prisma.InputJsonValue,
  opts: EnqueueOptions = {},
  tx: Prisma.TransactionClient = db,
): Promise<boolean> {
  try {
    await tx.job.create({
      data: {
        type,
        payload,
        dedupeKey: opts.dedupeKey,
        runAt: opts.runAt ?? new Date(),
        maxAttempts: opts.maxAttempts ?? 5,
      },
    });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }
}

const STALE_LOCK_MINUTES = 10;
const MAX_BACKOFF_MS = 30 * 60_000;

export function backoffMs(attempt: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempt - 1), MAX_BACKOFF_MS);
}

export async function claimNextJob(): Promise<Job | null> {
  const rows = await db.$queryRaw<Job[]>`
    UPDATE "Job"
    SET status = 'RUNNING', "lockedAt" = now(), attempts = attempts + 1, "updatedAt" = now()
    WHERE id = (
      SELECT id FROM "Job"
      WHERE status = 'PENDING' AND "runAt" <= now()
      ORDER BY "runAt"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *`;
  return rows[0] ?? null;
}

/** Jobs left RUNNING by a crashed process go back to the queue. */
export async function recoverStaleJobs(): Promise<number> {
  return db.$executeRaw`
    UPDATE "Job" SET status = 'PENDING', "lockedAt" = NULL, "updatedAt" = now()
    WHERE status = 'RUNNING' AND "lockedAt" < now() - make_interval(mins => ${STALE_LOCK_MINUTES})`;
}

export async function runJob(job: Job, handlers: Record<string, JobHandler>): Promise<void> {
  const handler = handlers[job.type];
  if (!handler) {
    await finish(job.id, "FAILED", `No handler for job type "${job.type}"`);
    return;
  }
  try {
    const result = await handler(job.payload, job);
    if (result && "rescheduleInMs" in result) {
      // Polling (e.g. Instagram video processing) does not consume a retry attempt.
      await db.job.update({
        where: { id: job.id },
        data: {
          status: "PENDING",
          lockedAt: null,
          attempts: { decrement: 1 },
          runAt: new Date(Date.now() + result.rescheduleInMs),
        },
      });
      return;
    }
    await finish(job.id, "DONE", null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const permanent = err instanceof PermanentJobError || job.attempts >= job.maxAttempts;
    console.error(`[jobs] ${job.type} ${job.id} attempt ${job.attempts} failed: ${message}`);
    if (permanent) {
      await finish(job.id, "FAILED", message);
    } else {
      await db.job.update({
        where: { id: job.id },
        data: {
          status: "PENDING",
          lockedAt: null,
          lastError: message.slice(0, 2000),
          runAt: new Date(Date.now() + backoffMs(job.attempts)),
        },
      });
    }
  }
}

async function finish(id: string, status: "DONE" | "FAILED", error: string | null) {
  await db.job.update({
    where: { id },
    data: { status, lockedAt: null, finishedAt: new Date(), lastError: error?.slice(0, 2000) ?? undefined },
  });
}

/** Remove finished jobs older than 14 days. */
export async function pruneJobs(): Promise<void> {
  await db.job.deleteMany({
    where: { status: { in: ["DONE", "FAILED"] }, finishedAt: { lt: new Date(Date.now() - 14 * 86_400_000) } },
  });
}

const HEARTBEAT_ID = "main";
/** Worker counts as healthy if it checked in within this window. */
const HEARTBEAT_FRESH_MS = 90_000;

export async function beatHeart(): Promise<void> {
  const now = new Date();
  await db.workerHeartbeat.upsert({
    where: { id: HEARTBEAT_ID },
    create: { id: HEARTBEAT_ID, seenAt: now },
    update: { seenAt: now },
  });
}

export async function isWorkerHealthy(): Promise<boolean> {
  const hb = await db.workerHeartbeat.findUnique({ where: { id: HEARTBEAT_ID } });
  return Boolean(hb && Date.now() - hb.seenAt.getTime() < HEARTBEAT_FRESH_MS);
}
