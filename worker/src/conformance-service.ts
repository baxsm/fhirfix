import { createHash } from "node:crypto";
import {
  buildCoverageMatrix,
  diffMatrices,
  InfernoClient,
  type AuthInfo,
  type InfernoInput,
  type InfernoTestResult,
  type MatrixCell,
  type TestKitDefinition,
  requiredSuiteInputs,
  summarizeMatrix,
  TEST_KITS,
} from "@shared/engine";
import { and, eq } from "drizzle-orm";
import { env } from "./env";
import { blobStore, db, logger, schema } from "./lib";
import { dispatchWebhook } from "./queues";
import { decryptSecret } from "./secret-crypto";

export interface ConformanceJob {
  packetRunId: string;
}

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_MS = 20 * 60 * 1000;

const inferno = new InfernoClient({ baseUrl: env.INFERNO_URL });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authInputs(auth: AuthInfo | null): InfernoInput[] {
  if (!auth) return [];
  return [{ name: "smart_auth_info", value: JSON.stringify(auth) }];
}

async function loadAuth(authConfigRef: string | null): Promise<AuthInfo | null> {
  if (!authConfigRef) return null;
  const [row] = await db
    .select({ ciphertext: schema.encryptedSecret.ciphertext })
    .from(schema.encryptedSecret)
    .where(eq(schema.encryptedSecret.id, authConfigRef))
    .limit(1);
  if (!row) return null;
  return JSON.parse(decryptSecret(row.ciphertext)) as AuthInfo;
}

async function runOneKit(
  kit: TestKitDefinition,
  targetEndpoint: string,
  auth: AuthInfo | null,
  onProgress: (completed: number, total: number, status: string) => Promise<void>,
): Promise<MatrixCell[]> {
  const suite = await inferno.suite(kit.suiteId);
  const provided: Record<string, string> = { url: targetEndpoint };
  for (const input of authInputs(auth)) provided[input.name] = input.value;

  const sessionId = await inferno.createSession(kit.suiteId);
  const inputs = requiredSuiteInputs(suite, provided);

  const started = await inferno.startRun(sessionId, kit.suiteId, inputs);
  const total = started.test_count ?? 0;
  await onProgress(0, total, "running");

  const deadline = Date.now() + MAX_POLL_MS;
  let results: InfernoTestResult[] = [];
  let status = started.status ?? "running";

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const run = await inferno.getRun(started.id);
    status = run.status ?? status;
    results = run.results ?? results;
    const settled = results.filter((r) => r.result !== "running" && r.result !== "wait").length;
    await onProgress(settled, total, status);
    if (status === "done" || status === "cancelled") break;
  }

  if (status !== "done" && status !== "cancelled") {
    await inferno.cancelRun(started.id).catch(() => {});
    throw new Error(`${kit.label} did not finish within ${MAX_POLL_MS / 60000} minutes`);
  }

  const requirements = await inferno.requirements(kit.suiteId);
  const final = results.length > 0 ? results : await inferno.runResults(started.id);
  return buildCoverageMatrix(kit, suite, requirements, final);
}

export async function executeConformancePacket(job: ConformanceJob): Promise<void> {
  const { packetRunId } = job;

  const [packet] = await db
    .select({
      id: schema.conformancePacketRun.id,
      workspaceId: schema.conformancePacketRun.workspaceId,
      testKits: schema.conformancePacketRun.testKits,
      targetEndpoint: schema.conformancePacketRun.targetEndpoint,
      authConfigRef: schema.conformancePacketRun.authConfigRef,
      previousRunId: schema.conformancePacketRun.previousRunId,
    })
    .from(schema.conformancePacketRun)
    .where(eq(schema.conformancePacketRun.id, packetRunId))
    .limit(1);

  if (!packet) {
    logger.warn("conformance.run", `${packetRunId} no longer exists`);
    return;
  }

  const kits = TEST_KITS.filter(
    (kit) => packet.testKits.includes(kit.id) && !kit.attended,
  );

  // claim the row, or a duplicate job overwrites the first run's finished status
  const claimed = await db
    .update(schema.conformancePacketRun)
    .set({ status: "running", startedAt: new Date() })
    .where(
      and(
        eq(schema.conformancePacketRun.id, packetRunId),
        eq(schema.conformancePacketRun.status, "queued"),
      ),
    )
    .returning({ id: schema.conformancePacketRun.id });

  if (claimed.length === 0) {
    logger.warn("conformance.run", `${packetRunId} is already running or finished, skipping`);
    return;
  }

  try {
    const infernoVersion = await inferno.version();
    const auth = await loadAuth(packet.authConfigRef);
    const igVersions: Record<string, string> = {};
    const progress: Record<string, { total: number; completed: number; status: string }> = {};
    const cells: MatrixCell[] = [];

    for (const kit of kits) {
      igVersions[kit.igIdentifier] = kit.igVersion;
      const kitCells = await runOneKit(kit, packet.targetEndpoint, auth, async (completed, total, status) => {
        progress[kit.id] = { completed, total, status };
        await db
          .update(schema.conformancePacketRun)
          .set({ progress })
          .where(eq(schema.conformancePacketRun.id, packetRunId));
      });
      cells.push(...kitCells);
      progress[kit.id] = {
        completed: progress[kit.id]?.total ?? kitCells.length,
        total: progress[kit.id]?.total ?? kitCells.length,
        status: "done",
      };
    }

    const summary = summarizeMatrix(cells);
    const completedAt = new Date();

    const bundle = {
      packetRunId,
      workspaceId: packet.workspaceId,
      targetEndpoint: packet.targetEndpoint,
      infernoVersion,
      igVersions,
      testKits: kits.map((kit) => ({
        id: kit.id,
        suiteId: kit.suiteId,
        kitVersion: kit.kitVersion,
        igIdentifier: kit.igIdentifier,
        igVersion: kit.igVersion,
      })),
      matrix: cells,
      summary,
      completedAt: completedAt.toISOString(),
    };
    const serialized = JSON.stringify(bundle, null, 2);
    const sha256 = createHash("sha256").update(serialized).digest("hex");
    const bundleRef = `${packet.workspaceId}/${packetRunId}/evidence.json`;
    await blobStore.put(bundleRef, serialized, "application/json");

    await db.insert(schema.evidenceBundle).values({
      id: `evd_${packetRunId.replace(/^pkt_/, "")}`,
      packetRunId,
      workspaceId: packet.workspaceId,
      bundleRef,
      sha256,
      sizeBytes: Buffer.byteLength(serialized, "utf8"),
    });

    await db
      .update(schema.conformancePacketRun)
      .set({
        status: "completed",
        resultsMatrix: cells,
        progress,
        igVersions,
        infernoVersion,
        overallResult: summary.overall,
        passCount: summary.pass,
        failCount: summary.fail,
        completedAt,
      })
      .where(eq(schema.conformancePacketRun.id, packetRunId));

    if (packet.previousRunId) {
      const [prior] = await db
        .select({ resultsMatrix: schema.conformancePacketRun.resultsMatrix })
        .from(schema.conformancePacketRun)
        .where(eq(schema.conformancePacketRun.id, packet.previousRunId))
        .limit(1);
      const moves = diffMatrices(prior?.resultsMatrix ?? [], cells);
      if (moves.length > 0) {
        logger.info("conformance.regression", `${packetRunId}: ${moves.length} requirement moves`);
      }
    }

    await dispatchWebhook({
      event: "conformance.completed",
      workspaceId: packet.workspaceId,
      data: { packetRunId, overallResult: summary.overall, sha256 },
    });
    logger.info("conformance.run", `${packetRunId} ${summary.overall} (${summary.pass}/${summary.total})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.conformancePacketRun)
      .set({ status: "failed", errorMessage: message, completedAt: new Date() })
      .where(eq(schema.conformancePacketRun.id, packetRunId));
    logger.error("conformance.run", `${packetRunId}: ${message}`);
    throw err;
  }
}
