import { eq } from "drizzle-orm";
import { db, logger, schema } from "./lib";
import { scheduleQueue } from "./queues";
import { schedulerId } from "./schedule-service";

// reconciles bullmq's job schedulers against the scheduled_check table.
//
// postgres owns the definitions; redis only holds the live timers. that ordering
// is what makes redis disposable - flushing it loses nothing that a worker
// restart cannot rebuild. it also means an enabled check whose scheduler was
// never registered (worker was down when it was created) starts firing on the
// next boot rather than staying silently dead.

export async function syncSchedulers(): Promise<{ registered: number; removed: number }> {
  const checks = await db
    .select({
      id: schema.scheduledCheck.id,
      scheduleCron: schema.scheduledCheck.scheduleCron,
      enabled: schema.scheduledCheck.enabled,
    })
    .from(schema.scheduledCheck);

  const wanted = new Map(
    checks.filter((c) => c.enabled).map((c) => [schedulerId(c.id), c.scheduleCron]),
  );

  const existing = await scheduleQueue.getJobSchedulers(0, -1, true);
  const existingIds = new Set(existing.map((s) => s.key));

  let removed = 0;
  for (const scheduler of existing) {
    // only touch keys this module owns, so an unrelated scheduler on the same
    // queue is never collateral damage.
    if (!scheduler.key.startsWith("sched:")) continue;
    if (!wanted.has(scheduler.key)) {
      await scheduleQueue.removeJobScheduler(scheduler.key);
      removed += 1;
    }
  }

  let registered = 0;
  for (const [key, pattern] of wanted) {
    // upsert is idempotent, so re-registering an unchanged scheduler is a no-op
    // rather than a duplicate timer.
    await upsertScheduler(key, pattern);
    if (!existingIds.has(key)) registered += 1;
  }

  logger.info(
    "schedule.sync",
    `${wanted.size} active schedule(s), ${registered} new, ${removed} stale removed`,
  );
  return { registered, removed };
}

// register or update one check's schedule. exported so the backend can call the
// same path when a check is created, edited, enabled or disabled.
export async function upsertScheduler(key: string, cronPattern: string): Promise<void> {
  const scheduledCheckId = key.replace(/^sched:/, "");
  await scheduleQueue.upsertJobScheduler(
    key,
    { pattern: cronPattern },
    {
      name: "fire",
      data: { scheduledCheckId },
      opts: { removeOnComplete: 100, removeOnFail: 500 },
    },
  );
}

export async function registerCheck(scheduledCheckId: string, cronPattern: string): Promise<void> {
  await upsertScheduler(schedulerId(scheduledCheckId), cronPattern);
}

export async function unregisterCheck(scheduledCheckId: string): Promise<void> {
  await scheduleQueue.removeJobScheduler(schedulerId(scheduledCheckId));
}

// re-read one check and bring its scheduler in line with it. used after a
// create/update/toggle so the change takes effect without waiting for a restart.
export async function syncOneCheck(scheduledCheckId: string): Promise<void> {
  const [check] = await db
    .select({
      id: schema.scheduledCheck.id,
      scheduleCron: schema.scheduledCheck.scheduleCron,
      enabled: schema.scheduledCheck.enabled,
    })
    .from(schema.scheduledCheck)
    .where(eq(schema.scheduledCheck.id, scheduledCheckId))
    .limit(1);

  if (!check || !check.enabled) {
    await unregisterCheck(scheduledCheckId);
    return;
  }
  await registerCheck(check.id, check.scheduleCron);
}
