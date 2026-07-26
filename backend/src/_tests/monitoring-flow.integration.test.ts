import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { detectDrift, loadPreviousRunId, loadSnapshot, persistDriftAlerts } from "@shared/db/drift";
import { ENGINE_VERSION } from "@shared/engine";
import { eq } from "drizzle-orm";
import { auth } from "@/auth/auth";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { decryptSecret } from "@/lib/secret-crypto";
import { scheduleQueue, schedulerId } from "@/queues/index";
import { appRouter } from "@/trpc/routers/index";
import { createCallerFactory } from "@/trpc/trpc";

// integration: scheduled checks + drift detection against real Postgres AND real
// Redis. the scheduler assertions matter most - a check that stores fine but
// never registers a timer looks completely healthy in the ui and never fires.

const email = `montest-${Date.now()}@example.com`;
const password = "monitoring-flow-pass-123";
let headers: Headers;
let workspaceId: string;

const createCaller = createCallerFactory(appRouter);

async function callerFor() {
  const session = await auth.api.getSession({ headers });
  return createCaller({
    db,
    headers,
    session: session?.session ?? null,
    user: session?.user ?? null,
  });
}

beforeAll(async () => {
  await auth.api.signUpEmail({ body: { email, password, name: "Mon Test" } });
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.email, email));
  const signIn = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const setCookie = signIn.headers.get("set-cookie") ?? "";
  headers = new Headers({ cookie: setCookie.split(";")[0] ?? "" });
  const caller = await callerFor();
  const org = await caller.workspace.create({ name: "Mon WS", slug: `mon-ws-${Date.now()}` });
  workspaceId = org.id;
});

afterAll(async () => {
  // remove every scheduler this suite registered so it cannot fire after the run.
  const checks = await db
    .select({ id: schema.scheduledCheck.id })
    .from(schema.scheduledCheck)
    .where(eq(schema.scheduledCheck.workspaceId, workspaceId));
  for (const c of checks) {
    await scheduleQueue.removeJobScheduler(schedulerId(c.id)).catch(() => {});
  }
  await db
    .delete(schema.mappingRegistryEntry)
    .where(eq(schema.mappingRegistryEntry.workspaceId, workspaceId));
  await db.delete(schema.driftAlert).where(eq(schema.driftAlert.workspaceId, workspaceId));
  await db.delete(schema.scheduledCheck).where(eq(schema.scheduledCheck.workspaceId, workspaceId));
  await db.delete(schema.finding).where(eq(schema.finding.workspaceId, workspaceId));
  await db.delete(schema.run).where(eq(schema.run.workspaceId, workspaceId));

  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (user) await db.delete(schema.user).where(eq(schema.user.id, user.id));
  await scheduleQueue.close();
});

const baseCheck = {
  name: "Nightly US Core",
  scheduleCron: "0 3 * * *",
  targetType: "endpoint" as const,
  targetRef: "https://example.org/fhir/Patient/1",
  profiles: [],
  registryScope: null,
  baselineConfig: { minPassRate: 90 },
  alertChannels: [],
  enabled: true,
};

describe("scheduled check lifecycle", () => {
  test("creating an enabled check registers a real bullmq scheduler", async () => {
    const caller = await callerFor();
    const { id } = await caller.monitoring.createCheck({ workspaceId, ...baseCheck });

    const schedulers = await scheduleQueue.getJobSchedulers(0, -1, true);
    const mine = schedulers.find((s) => s.key === schedulerId(id));
    expect(mine).toBeDefined();
    expect(mine?.pattern).toBe("0 3 * * *");
  });

  test("a check created disabled registers no scheduler", async () => {
    const caller = await callerFor();
    const { id } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Disabled at birth",
      enabled: false,
    });

    const schedulers = await scheduleQueue.getJobSchedulers(0, -1, true);
    expect(schedulers.find((s) => s.key === schedulerId(id))).toBeUndefined();
  });

  test("editing the cron moves the live scheduler to the new pattern", async () => {
    const caller = await callerFor();
    const { id } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Repointed",
    });

    await caller.monitoring.updateCheck({
      workspaceId,
      id,
      ...baseCheck,
      name: "Repointed",
      scheduleCron: "*/30 * * * *",
    });

    const schedulers = await scheduleQueue.getJobSchedulers(0, -1, true);
    const mine = schedulers.find((s) => s.key === schedulerId(id));
    expect(mine?.pattern).toBe("*/30 * * * *");
  });

  test("disabling removes the timer, re-enabling puts it back", async () => {
    const caller = await callerFor();
    const { id } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Toggle me",
    });

    await caller.monitoring.setEnabled({ workspaceId, id, enabled: false });
    let schedulers = await scheduleQueue.getJobSchedulers(0, -1, true);
    expect(schedulers.find((s) => s.key === schedulerId(id))).toBeUndefined();

    await caller.monitoring.setEnabled({ workspaceId, id, enabled: true });
    schedulers = await scheduleQueue.getJobSchedulers(0, -1, true);
    expect(schedulers.find((s) => s.key === schedulerId(id))).toBeDefined();
  });

  test("deleting a check drops its scheduler too", async () => {
    const caller = await callerFor();
    const { id } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Short lived",
    });

    await caller.monitoring.deleteCheck({ workspaceId, id });

    const schedulers = await scheduleQueue.getJobSchedulers(0, -1, true);
    expect(schedulers.find((s) => s.key === schedulerId(id))).toBeUndefined();

    const rows = await db
      .select({ id: schema.scheduledCheck.id })
      .from(schema.scheduledCheck)
      .where(eq(schema.scheduledCheck.id, id));
    expect(rows).toHaveLength(0);
  });

  test("an invalid cron is refused before anything is stored", async () => {
    const caller = await callerFor();
    let message = "";
    try {
      await caller.monitoring.createCheck({
        workspaceId,
        ...baseCheck,
        name: "Bad cron",
        scheduleCron: "every tuesday please",
      });
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain("cron");

    const rows = await db
      .select({ id: schema.scheduledCheck.id })
      .from(schema.scheduledCheck)
      .where(eq(schema.scheduledCheck.name, "Bad cron"));
    expect(rows).toHaveLength(0);
  });

  test("a non-http target is refused", async () => {
    const caller = await callerFor();
    let message = "";
    try {
      await caller.monitoring.createCheck({
        workspaceId,
        ...baseCheck,
        name: "Bad target",
        targetRef: "file:///etc/passwd",
      });
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain("http");
  });

  test("alert channel targets are encrypted at rest and never listed raw", async () => {
    const caller = await callerFor();
    const slackUrl = "https://hooks.slack.com/services/T000/B000/secret-token";
    const { id } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "With channels",
      alertChannels: [{ type: "slack", target: slackUrl }],
    });

    const [row] = await db
      .select({ alertChannels: schema.scheduledCheck.alertChannels })
      .from(schema.scheduledCheck)
      .where(eq(schema.scheduledCheck.id, id));

    const stored = row?.alertChannels?.[0]?.target ?? "";
    expect(stored).not.toBe(slackUrl);
    expect(stored).not.toContain("secret-token");
    expect(decryptSecret(stored)).toBe(slackUrl);

    // the list surface exposes which channels exist, never the secret url.
    const checks = await caller.monitoring.listChecks({ workspaceId });
    const listed = checks.find((c) => c.id === id);
    expect(listed?.channelTypes).toEqual(["slack"]);
    expect(JSON.stringify(listed)).not.toContain("secret-token");
  });

  test("listChecks describes the cron in plain language", async () => {
    const caller = await callerFor();
    const { id } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Described",
      scheduleCron: "0 */6 * * *",
    });
    const checks = await caller.monitoring.listChecks({ workspaceId });
    expect(checks.find((c) => c.id === id)?.scheduleLabel).toBe("Every 6 hours");
  });
});

// seeds a completed scheduled run with findings, exactly as the worker would.
async function seedRun(args: {
  scheduledCheckId: string;
  score: number;
  errors: Array<{ fingerprint: string; message: string }>;
  igVersions?: Record<string, string>;
  createdAt: Date;
}): Promise<string> {
  const runId = createId("run");
  await db.insert(schema.run).values({
    id: runId,
    workspaceId,
    actorType: "scheduled",
    actorId: args.scheduledCheckId,
    source: "scheduled",
    inputType: "fhir_json",
    engineVersion: ENGINE_VERSION,
    status: "completed",
    conformanceScoreAfter: args.score,
    igVersions: args.igVersions ?? { "hl7.fhir.us.core": "6.1.0" },
    createdAt: args.createdAt,
    completedAt: args.createdAt,
  });

  let rank = 0;
  for (const e of args.errors) {
    await db.insert(schema.finding).values({
      id: createId("finding"),
      runId,
      workspaceId,
      severity: "error",
      category: "profile",
      ruleSource: "us-core",
      specCitation: "US Core 6.1.0",
      rawValidatorMessage: e.message,
      plainMessage: e.message,
      suggestedFix: "fix it",
      fixConfidence: "manual",
      dedupFingerprint: e.fingerprint,
      rank: rank++,
    });
  }
  return runId;
}

describe("drift detection against real data", () => {
  test("a pass-rate drop produces a persisted, acknowledgeable alert", async () => {
    const caller = await callerFor();
    const { id: checkId } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Drift check",
      baselineConfig: { minPassRate: 90 },
    });

    const healthy = await seedRun({
      scheduledCheckId: checkId,
      score: 980,
      errors: [],
      createdAt: new Date(Date.now() - 60_000),
    });
    const degraded = await seedRun({
      scheduledCheckId: checkId,
      score: 610,
      errors: [{ fingerprint: "fp_new_class", message: "Patient.identifier needs a system." }],
      createdAt: new Date(),
    });

    // the exact path the worker runs after a scheduled run completes.
    const previousRunId = await loadPreviousRunId(db, checkId, degraded);
    expect(previousRunId).toBe(healthy);

    const current = await loadSnapshot(db, degraded);
    const previous = await loadSnapshot(db, previousRunId as string);
    expect(current?.conformanceScoreAfter).toBe(610);
    expect(previous?.errorCount).toBe(0);

    const detected = detectDrift({
      current: current as NonNullable<typeof current>,
      previous,
      baseline: { minPassRate: 90 },
    });
    const types = detected.map((d) => d.type).sort();
    expect(types).toEqual(["new_error_class", "pass_rate_drop"]);

    const persisted = await persistDriftAlerts(db, {
      workspaceId,
      scheduledCheckId: checkId,
      runId: degraded,
      alerts: detected,
      makeId: () => createId("driftAlert"),
    });
    expect(persisted).toHaveLength(2);

    // the feed shows them, joined to the check name.
    const open = await caller.monitoring.listAlerts({ workspaceId, unacknowledgedOnly: true });
    const mine = open.filter((a) => a.scheduledCheckId === checkId);
    expect(mine).toHaveLength(2);
    expect(mine[0]?.checkName).toBe("Drift check");

    const counts = await caller.monitoring.alertCounts({ workspaceId });
    expect(counts.open).toBeGreaterThanOrEqual(2);

    // acknowledging removes it from the open feed and is not repeatable.
    const target = mine[0] as (typeof mine)[number];
    await caller.monitoring.acknowledgeAlert({ workspaceId, id: target.id });

    const stillOpen = await caller.monitoring.listAlerts({ workspaceId, unacknowledgedOnly: true });
    expect(stillOpen.find((a) => a.id === target.id)).toBeUndefined();

    let secondAck = "";
    try {
      await caller.monitoring.acknowledgeAlert({ workspaceId, id: target.id });
    } catch (err) {
      secondAck = err instanceof Error ? err.message : String(err);
    }
    expect(secondAck).toContain("already acknowledged");
  });

  test("an ig version change between two runs is detected", async () => {
    const caller = await callerFor();
    const { id: checkId } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "IG check",
      baselineConfig: null,
    });

    const before = await seedRun({
      scheduledCheckId: checkId,
      score: 990,
      errors: [],
      igVersions: { "hl7.fhir.us.core": "6.1.0" },
      createdAt: new Date(Date.now() - 60_000),
    });
    const after = await seedRun({
      scheduledCheckId: checkId,
      score: 990,
      errors: [],
      igVersions: { "hl7.fhir.us.core": "7.0.0" },
      createdAt: new Date(),
    });

    const current = await loadSnapshot(db, after);
    const previous = await loadSnapshot(db, before);
    const detected = detectDrift({
      current: current as NonNullable<typeof current>,
      previous,
      baseline: null,
    });

    expect(detected).toHaveLength(1);
    expect(detected[0]?.type).toBe("ig_version_change");
    expect(detected[0]?.metricBefore).toBe("hl7.fhir.us.core 6.1.0");
    expect(detected[0]?.metricAfter).toBe("hl7.fhir.us.core 7.0.0");
  });

  test("a healthy scheduled run writes no alerts", async () => {
    const caller = await callerFor();
    const { id: checkId } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Healthy check",
      baselineConfig: { minPassRate: 90 },
    });

    await seedRun({
      scheduledCheckId: checkId,
      score: 985,
      errors: [],
      createdAt: new Date(Date.now() - 60_000),
    });
    const good = await seedRun({
      scheduledCheckId: checkId,
      score: 990,
      errors: [],
      createdAt: new Date(),
    });

    const previousRunId = await loadPreviousRunId(db, checkId, good);
    const detected = detectDrift({
      current: (await loadSnapshot(db, good)) as NonNullable<
        Awaited<ReturnType<typeof loadSnapshot>>
      >,
      previous: previousRunId ? await loadSnapshot(db, previousRunId) : null,
      baseline: { minPassRate: 90 },
    });
    expect(detected).toHaveLength(0);
  });

  test("unmapped authorities come from auto-learned suggestions, not rule ids", async () => {
    const caller = await callerFor();
    const { id: checkId } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Authority check",
      baselineConfig: null,
    });

    const runId = await seedRun({
      scheduledCheckId: checkId,
      score: 900,
      // a terminology finding whose ruleSource is a validator rule id. an earlier
      // version read this field and reported the rule as if it were an authority.
      errors: [{ fingerprint: "fp_term", message: "Unknown code system." }],
      createdAt: new Date(),
    });

    // the real authority, as the engine's auto-learn loop records it.
    await db.insert(schema.mappingRegistryEntry).values({
      id: createId("mapping"),
      workspaceId,
      type: "authority_to_system",
      sourceValue: "DRNBR",
      targetValue: "http://example.org/fhir/sid/mrn",
      status: "suggested",
      createdBy: "system",
    });

    const snapshot = await loadSnapshot(db, runId);
    expect(snapshot?.unmappedAuthorities).toEqual(["DRNBR"]);
    expect(snapshot?.unmappedAuthorities).not.toContain("us-core");
  });

  test("a run from another check is never used as the previous run", async () => {
    const caller = await callerFor();
    const { id: checkA } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Check A",
    });
    const { id: checkB } = await caller.monitoring.createCheck({
      workspaceId,
      ...baseCheck,
      name: "Check B",
    });

    await seedRun({
      scheduledCheckId: checkB,
      score: 100,
      errors: [],
      createdAt: new Date(Date.now() - 30_000),
    });
    const aRun = await seedRun({
      scheduledCheckId: checkA,
      score: 900,
      errors: [],
      createdAt: new Date(),
    });

    // check A has only this one run, so there is no previous despite B having one.
    expect(await loadPreviousRunId(db, checkA, aRun)).toBeNull();
  });
});
