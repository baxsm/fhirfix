import { eq } from "drizzle-orm";
import { db, logger, schema } from "./lib";
import { scheduleQueue } from "./queues";
import { schedulerId } from "./schedule-service";


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
    if (!scheduler.key.startsWith("sched:")) continue;
    if (!wanted.has(scheduler.key)) {
      await scheduleQueue.removeJobScheduler(scheduler.key);
      removed += 1;
    }
  }

  let registered = 0;
  for (const [key, pattern] of wanted) {
    await upsertScheduler(key, pattern);
    if (!existingIds.has(key)) registered += 1;
  }

  logger.info(
    "schedule.sync",
    `${wanted.size} active schedule(s), ${registered} new, ${removed} stale removed`,
  );
  return { registered, removed };
}

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
