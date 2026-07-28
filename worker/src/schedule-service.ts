import { redactionPolicyFor, storeRunInput } from "@shared/db/ingest";
import { detectInput, ENGINE_VERSION } from "@shared/engine";
import { and, desc, eq } from "drizzle-orm";
import { blobKey, blobStore, db, logger, runId as makeRunId, schema } from "./lib";
import { remediationQueue } from "./queues";


export interface ScheduleJob {
  scheduledCheckId: string;
}

// how long to wait on a customer endpoint before giving up.
const FETCH_TIMEOUT_MS = 30_000;
const MAX_INPUT_BYTES = 5_000_000;

export async function executeScheduledCheck(job: ScheduleJob): Promise<void> {
  const { scheduledCheckId } = job;

  const [check] = await db
    .select({
      id: schema.scheduledCheck.id,
      workspaceId: schema.scheduledCheck.workspaceId,
      name: schema.scheduledCheck.name,
      targetType: schema.scheduledCheck.targetType,
      targetRef: schema.scheduledCheck.targetRef,
      profiles: schema.scheduledCheck.profiles,
      enabled: schema.scheduledCheck.enabled,
    })
    .from(schema.scheduledCheck)
    .where(eq(schema.scheduledCheck.id, scheduledCheckId))
    .limit(1);

  if (!check) {
    logger.warn("schedule.fire", `${scheduledCheckId} no longer exists, removing schedule`);
    await remediationQueue.removeJobScheduler(schedulerId(scheduledCheckId)).catch(() => {});
    return;
  }

  if (!check.enabled) {
    logger.debug("schedule.fire", `${scheduledCheckId} is disabled, skipping`);
    return;
  }

  let content: string;
  try {
    content = await fetchTarget(check.workspaceId, check.targetType, check.targetRef);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await recordFailure(scheduledCheckId, detail);
    logger.error("schedule.fetch", `${scheduledCheckId}: ${detail}`);
    return;
  }

  const runId = makeRunId();
  const key = blobKey(check.workspaceId, runId, "input");

  let stored: Awaited<ReturnType<typeof storeRunInput>>;
  try {
    const policy = await redactionPolicyFor(db, check.workspaceId);
    stored = await storeRunInput(db, blobStore, {
      workspaceId: check.workspaceId,
      key,
      content,
      policy,
    });
    if (stored.rejected) {
      await recordFailure(
        scheduledCheckId,
        "workspace requires PHI redaction and the fetched payload could not be parsed to redact it",
      );
      return;
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await recordFailure(scheduledCheckId, `could not store input: ${detail}`);
    logger.error("schedule.store", `${scheduledCheckId}: ${detail}`);
    return;
  }

  const inputType = detectInput(content).inputType;

  await db.insert(schema.run).values({
    id: runId,
    workspaceId: check.workspaceId,
    actorType: "scheduled",
    actorId: check.id,
    source: "scheduled",
    inputType,
    engineVersion: ENGINE_VERSION,
    status: "queued",
    profilesRequested: check.profiles ?? [],
    inputRef: stored.key,
  });

  await remediationQueue.add(
    "remediate",
    {
      runId,
      workspaceId: check.workspaceId,
      profiles: check.profiles ?? [],
      autoFix: true,
    },
    { removeOnComplete: 1000, removeOnFail: 1000 },
  );

  await db
    .update(schema.scheduledCheck)
    .set({ lastRunId: runId, lastRunAt: new Date(), lastError: null })
    .where(eq(schema.scheduledCheck.id, scheduledCheckId));

  logger.info("schedule.fire", `${scheduledCheckId} queued ${runId} (${inputType})`);
}

async function recordFailure(scheduledCheckId: string, detail: string): Promise<void> {
  await db
    .update(schema.scheduledCheck)
    .set({ lastRunAt: new Date(), lastError: detail.slice(0, 500) })
    .where(eq(schema.scheduledCheck.id, scheduledCheckId));
}

async function fetchTarget(
  workspaceId: string,
  targetType: "endpoint" | "source_url" | "upload_folder",
  targetRef: string,
): Promise<string> {
  if (targetType === "upload_folder") {
    return fetchLatestUpload(workspaceId, targetRef);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(targetRef, {
      headers: { Accept: "application/fhir+json, application/json" },
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(
      err instanceof Error && err.name === "AbortError"
        ? `target did not respond within ${FETCH_TIMEOUT_MS / 1000}s`
        : `could not reach target: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`target returned HTTP ${res.status}`);
  }

  const body = await res.text();
  if (body.length === 0) throw new Error("target returned an empty body");
  if (body.length > MAX_INPUT_BYTES) {
    throw new Error(`target returned ${body.length} bytes, over the ${MAX_INPUT_BYTES} limit`);
  }
  return body;
}

async function fetchLatestUpload(workspaceId: string, prefix: string): Promise<string> {
  const [latest] = await db
    .select({ key: schema.storedObject.key })
    .from(schema.storedObject)
    .where(
      and(
        eq(schema.storedObject.workspaceId, workspaceId),
        eq(schema.storedObject.kind, "input"),
        eq(schema.storedObject.uploadState, "stored"),
      ),
    )
    .orderBy(desc(schema.storedObject.createdAt))
    .limit(1);

  if (!latest) throw new Error(`no uploads found under "${prefix}"`);
  return blobStore.get(latest.key);
}

export function schedulerId(scheduledCheckId: string): string {
  return `sched:${scheduledCheckId}`;
}
