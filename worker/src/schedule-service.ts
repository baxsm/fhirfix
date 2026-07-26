import { detectInput, ENGINE_VERSION } from "@shared/engine";
import { and, desc, eq } from "drizzle-orm";
import { blobKey, blobStore, db, logger, runId as makeRunId, schema } from "./lib";
import { remediationQueue } from "./queues";

// executes ONE firing of a scheduled check: fetch the target, store it as the run
// input, and enqueue a normal remediation job. from here the run is
// indistinguishable from a UI or API run except for actorType/source, so it flows
// through the same engine, credits and completion path.
//
// a fetch failure is recorded on the check row (last_error) rather than thrown
// away, because a check that has been silently failing for a week is the exact
// thing the monitoring page exists to surface.

export interface ScheduleJob {
  scheduledCheckId: string;
}

// how long to wait on a customer endpoint before giving up.
const FETCH_TIMEOUT_MS = 30_000;
// cap the fetched payload so one huge endpoint cannot exhaust worker memory.
// matches the 5MB ceiling the tRPC submit path enforces on pasted content.
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
    // the check was deleted but its schedule outlived it. drop the schedule so
    // this does not fire again.
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

  try {
    const { sha256, sizeBytes } = await blobStore.put(key, content, "application/json");
    await db
      .insert(schema.storedObject)
      .values({
        key,
        workspaceId: check.workspaceId,
        bucket: "local",
        kind: "input",
        sizeBytes,
        contentType: "application/json",
        sha256,
        containsPhi: false,
        uploadState: "stored",
      })
      .onConflictDoUpdate({
        target: schema.storedObject.key,
        set: { bucket: "local", kind: "input", sizeBytes, sha256, uploadState: "stored" },
      });
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
    inputRef: key,
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

  // clearing last_error on success is what makes the field mean "the most recent
  // fire failed" rather than "something failed once, ever".
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

// pull the resource to check. `endpoint` and `source_url` both resolve to an HTTP
// GET; they differ in what the ui asks for, not in how they are fetched.
// `upload_folder` reads the newest stored input blob in the workspace, which is
// how a "watch what my integration uploads" check works without an ingest daemon.
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

// the newest stored input object in THIS workspace. the workspace filter is
// load-bearing, not defensive: without it a check would happily read another
// tenant's uploaded resource and score it as its own.
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

// the bullmq scheduler id for a check. one scheduler per check, derived rather
// than stored, so create/update/delete all address the same key.
export function schedulerId(scheduledCheckId: string): string {
  return `sched:${scheduledCheckId}`;
}
