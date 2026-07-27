import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { loadActiveMappings, persistSuggestions } from "@shared/db/mappings";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth/auth";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { appRouter } from "@/trpc/routers/index";
import { createCallerFactory } from "@/trpc/trpc";

const email = `maptest-${Date.now()}@example.com`;
const password = "map-flow-pass-123";
let headers: Headers;
let workspaceId: string;

const createCaller = createCallerFactory(appRouter);

async function cleanup() {
  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (user) await db.delete(schema.user).where(eq(schema.user.id, user.id));
  if (workspaceId) {
    await db
      .delete(schema.mappingRegistryEntry)
      .where(eq(schema.mappingRegistryEntry.workspaceId, workspaceId));
  }
}

beforeAll(async () => {
  await auth.api.signUpEmail({ body: { email, password, name: "Map Test" } });
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.email, email));
  const signIn = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const setCookie = signIn.headers.get("set-cookie") ?? "";
  headers = new Headers({ cookie: setCookie.split(";")[0] ?? "" });
  const caller = await callerFor();
  const org = await caller.workspace.create({ name: "Map WS", slug: `map-ws-${Date.now()}` });
  workspaceId = org.id;
  await db
    .delete(schema.mappingRegistryEntry)
    .where(eq(schema.mappingRegistryEntry.workspaceId, workspaceId));
});

afterAll(cleanup);

async function callerFor() {
  const session = await auth.api.getSession({ headers });
  return createCaller({
    db,
    headers,
    session: session?.session ?? null,
    user: session?.user ?? null,
  });
}

// drop everything between tests so counts and list assertions are exact.
async function resetRegistry() {
  await db
    .delete(schema.mappingRegistryEntry)
    .where(eq(schema.mappingRegistryEntry.workspaceId, workspaceId));
}

function suggestion(sourceValue: string) {
  return {
    type: "authority_to_system" as const,
    sourceValue,
    targetValue: `http://example.org/fhir/sid/${sourceValue.toLowerCase()}`,
    targetSystem: null,
    confidence: 80,
  };
}

describe("mappings.create + list", () => {
  test("creates an active mapping and lists it", async () => {
    await resetRegistry();
    const caller = await callerFor();
    const { id } = await caller.mappings.create({
      workspaceId,
      type: "authority_to_system",
      sourceValue: "ACME-MRN",
      targetValue: "http://acme.example/fhir/sid/mrn",
      targetSystem: null,
      scope: "workspace",
      sourceSystem: null,
    });
    const rows = await caller.mappings.list({ workspaceId });
    expect(rows.length).toBe(1);
    expect(rows[0]?.id).toBe(id);
    expect(rows[0]?.status).toBe("active");
    expect(rows[0]?.version).toBe(1);
  });

  test("a second mapping for the same source value is a conflict, not a duplicate", async () => {
    await resetRegistry();
    const caller = await callerFor();
    const base = {
      workspaceId,
      type: "authority_to_system" as const,
      sourceValue: "DUP-MRN",
      targetValue: "http://a.example/mrn",
      targetSystem: null,
      scope: "workspace" as const,
      sourceSystem: null,
    };
    await caller.mappings.create(base);
    let message = "";
    try {
      await caller.mappings.create({ ...base, targetValue: "http://b.example/mrn" });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/already exists/i);
    // and the original survived untouched.
    const rows = await caller.mappings.list({ workspaceId });
    expect(rows.length).toBe(1);
    expect(rows[0]?.targetValue).toBe("http://a.example/mrn");
  });

  test("a source_system mapping without a source system is rejected", async () => {
    await resetRegistry();
    const caller = await callerFor();
    let message = "";
    try {
      await caller.mappings.create({
        workspaceId,
        type: "authority_to_system",
        sourceValue: "NO-SYS",
        targetValue: "http://x.example/mrn",
        targetSystem: null,
        scope: "source_system",
        sourceSystem: null,
      });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/needs a source system/i);
  });
});

describe("mappings.update supersede chain", () => {
  test("editing supersedes the old row and bumps the version", async () => {
    await resetRegistry();
    const caller = await callerFor();
    const { id: v1 } = await caller.mappings.create({
      workspaceId,
      type: "code_to_code",
      sourceValue: "M",
      targetValue: "male",
      targetSystem: null,
      scope: "workspace",
      sourceSystem: null,
    });

    const { id: v2, version } = await caller.mappings.update({
      workspaceId,
      mappingId: v1,
      targetValue: "male-corrected",
      targetSystem: null,
    });
    expect(version).toBe(2);

    // the list shows only the new row: superseded rows are history.
    const rows = await caller.mappings.list({ workspaceId });
    expect(rows.length).toBe(1);
    expect(rows[0]?.id).toBe(v2);
    expect(rows[0]?.targetValue).toBe("male-corrected");

    // the old row still exists, pointing forward.
    const [old] = await db
      .select()
      .from(schema.mappingRegistryEntry)
      .where(eq(schema.mappingRegistryEntry.id, v1))
      .limit(1);
    expect(old?.supersededById).toBe(v2);
    expect(old?.targetValue).toBe("male"); // never mutated in place

    // history returns the whole chain oldest first.
    const chain = await caller.mappings.history({ workspaceId, mappingId: v2 });
    expect(chain.map((c) => c.version)).toEqual([1, 2]);
    expect(chain.map((c) => c.targetValue)).toEqual(["male", "male-corrected"]);
  });

  test("editing an already-superseded row is rejected", async () => {
    await resetRegistry();
    const caller = await callerFor();
    const { id: v1 } = await caller.mappings.create({
      workspaceId,
      type: "code_to_code",
      sourceValue: "F",
      targetValue: "female",
      targetSystem: null,
      scope: "workspace",
      sourceSystem: null,
    });
    await caller.mappings.update({
      workspaceId,
      mappingId: v1,
      targetValue: "female-v2",
      targetSystem: null,
    });
    let message = "";
    try {
      await caller.mappings.update({
        workspaceId,
        mappingId: v1,
        targetValue: "female-v3",
        targetSystem: null,
      });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/already been replaced/i);
  });

  test("a superseded row never reaches the engine", async () => {
    await resetRegistry();
    const caller = await callerFor();
    const { id: v1 } = await caller.mappings.create({
      workspaceId,
      type: "authority_to_system",
      sourceValue: "OLD-MRN",
      targetValue: "http://old.example/mrn",
      targetSystem: null,
      scope: "workspace",
      sourceSystem: null,
    });
    await caller.mappings.update({
      workspaceId,
      mappingId: v1,
      targetValue: "http://new.example/mrn",
      targetSystem: null,
    });

    const forEngine = await loadActiveMappings(db, workspaceId);
    expect(forEngine.length).toBe(1);
    expect(forEngine[0]?.targetValue).toBe("http://new.example/mrn");
  });
});

describe("mappings suggestion lifecycle", () => {
  test("approving a suggestion makes it active and visible to the engine", async () => {
    await resetRegistry();
    const caller = await callerFor();

    // the auto-learn loop writes it; nothing else can.
    await persistSuggestions(db, workspaceId, [suggestion("LEARNED-MRN")], () =>
      createId("mapping"),
    );

    const pending = await caller.mappings.list({ workspaceId, status: "suggested" });
    expect(pending.length).toBe(1);
    expect(pending[0]?.createdBy).toBe("system");

    // a suggestion is NOT an engine input until a human approves it.
    expect((await loadActiveMappings(db, workspaceId)).length).toBe(0);

    const id = pending[0]?.id ?? "";
    await caller.mappings.approve({ workspaceId, mappingId: id });

    const active = await loadActiveMappings(db, workspaceId);
    expect(active.length).toBe(1);
    expect(active[0]?.sourceValue).toBe("LEARNED-MRN");

    const [row] = await db
      .select()
      .from(schema.mappingRegistryEntry)
      .where(eq(schema.mappingRegistryEntry.id, id))
      .limit(1);
    expect(row?.approvedBy).toBeTruthy();
  });

  test("rejecting a suggestion stops the auto-learn loop re-suggesting it", async () => {
    await resetRegistry();
    const caller = await callerFor();
    await persistSuggestions(db, workspaceId, [suggestion("NOPE-MRN")], () => createId("mapping"));
    const [pending] = await caller.mappings.list({ workspaceId, status: "suggested" });
    await caller.mappings.reject({ workspaceId, mappingId: pending?.id ?? "" });

    // the next run learns the same thing again and must not resurrect it.
    const written = await persistSuggestions(db, workspaceId, [suggestion("NOPE-MRN")], () =>
      createId("mapping"),
    );
    expect(written).toBe(0);
    expect((await caller.mappings.list({ workspaceId, status: "suggested" })).length).toBe(0);
  });

  test("approving twice is a not-found, not a double approve", async () => {
    await resetRegistry();
    const caller = await callerFor();
    await persistSuggestions(db, workspaceId, [suggestion("ONCE-MRN")], () => createId("mapping"));
    const [pending] = await caller.mappings.list({ workspaceId, status: "suggested" });
    const id = pending?.id ?? "";
    await caller.mappings.approve({ workspaceId, mappingId: id });
    let message = "";
    try {
      await caller.mappings.approve({ workspaceId, mappingId: id });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/no longer pending/i);
  });

  test("deprecate removes it from engine input; reactivate brings it back", async () => {
    await resetRegistry();
    const caller = await callerFor();
    const { id } = await caller.mappings.create({
      workspaceId,
      type: "authority_to_system",
      sourceValue: "TOGGLE-MRN",
      targetValue: "http://toggle.example/mrn",
      targetSystem: null,
      scope: "workspace",
      sourceSystem: null,
    });
    expect((await loadActiveMappings(db, workspaceId)).length).toBe(1);

    await caller.mappings.deprecate({ workspaceId, mappingId: id });
    expect((await loadActiveMappings(db, workspaceId)).length).toBe(0);
    // the row survives: past reports still explain themselves.
    expect((await caller.mappings.list({ workspaceId, status: "deprecated" })).length).toBe(1);

    await caller.mappings.reactivate({ workspaceId, mappingId: id });
    expect((await loadActiveMappings(db, workspaceId)).length).toBe(1);
  });
});

describe("mapping scope", () => {
  test("a source_system mapping only applies to its own source system", async () => {
    await resetRegistry();
    const caller = await callerFor();
    await caller.mappings.create({
      workspaceId,
      type: "authority_to_system",
      sourceValue: "SCOPED-MRN",
      targetValue: "http://epic.example/mrn",
      targetSystem: null,
      scope: "source_system",
      sourceSystem: "epic-feed",
    });

    // a run that names no source system, or a different one, must not see it.
    expect((await loadActiveMappings(db, workspaceId)).length).toBe(0);
    expect((await loadActiveMappings(db, workspaceId, "cerner-feed")).length).toBe(0);
    // its own feed does.
    const own = await loadActiveMappings(db, workspaceId, "epic-feed");
    expect(own.length).toBe(1);
    expect(own[0]?.targetValue).toBe("http://epic.example/mrn");
  });

  test("a source_system mapping is ordered ahead of the workspace default", async () => {
    await resetRegistry();
    const caller = await callerFor();
    await caller.mappings.create({
      workspaceId,
      type: "authority_to_system",
      sourceValue: "BOTH-MRN",
      targetValue: "http://default.example/mrn",
      targetSystem: null,
      scope: "workspace",
      sourceSystem: null,
    });
    await caller.mappings.create({
      workspaceId,
      type: "authority_to_system",
      sourceValue: "BOTH-MRN",
      targetValue: "http://specific.example/mrn",
      targetSystem: null,
      scope: "source_system",
      sourceSystem: "epic-feed",
    });

    // the engine takes the first match, so the specific one must come first.
    const rows = await loadActiveMappings(db, workspaceId, "epic-feed");
    expect(rows.length).toBe(2);
    expect(rows[0]?.targetValue).toBe("http://specific.example/mrn");
  });
});

describe("mappings.importRows", () => {
  test("imports fresh rows and reports the ones that collide", async () => {
    await resetRegistry();
    const caller = await callerFor();
    await caller.mappings.create({
      workspaceId,
      type: "code_to_code",
      sourceValue: "TAKEN",
      targetValue: "already-here",
      targetSystem: null,
      scope: "workspace",
      sourceSystem: null,
    });

    const res = await caller.mappings.importRows({
      workspaceId,
      rows: [
        {
          type: "code_to_code",
          sourceValue: "FRESH-1",
          targetValue: "a",
          targetSystem: null,
          scope: "workspace",
          sourceSystem: null,
        },
        {
          type: "code_to_code",
          sourceValue: "TAKEN",
          targetValue: "b",
          targetSystem: null,
          scope: "workspace",
          sourceSystem: null,
        },
        // duplicated inside the payload itself.
        {
          type: "code_to_code",
          sourceValue: "FRESH-1",
          targetValue: "c",
          targetSystem: null,
          scope: "workspace",
          sourceSystem: null,
        },
      ],
    });

    expect(res.imported).toBe(1);
    expect(res.skipped).toContain("TAKEN");
    expect(res.skipped).toContain("FRESH-1"); // the in-file duplicate
    // the pre-existing row was never overwritten.
    const [taken] = await db
      .select({ targetValue: schema.mappingRegistryEntry.targetValue })
      .from(schema.mappingRegistryEntry)
      .where(
        and(
          eq(schema.mappingRegistryEntry.workspaceId, workspaceId),
          eq(schema.mappingRegistryEntry.sourceValue, "TAKEN"),
        ),
      )
      .limit(1);
    expect(taken?.targetValue).toBe("already-here");
  });
});

describe("mappings.counts", () => {
  test("counts live rows per status", async () => {
    await resetRegistry();
    const caller = await callerFor();
    await caller.mappings.create({
      workspaceId,
      type: "code_to_code",
      sourceValue: "C1",
      targetValue: "x",
      targetSystem: null,
      scope: "workspace",
      sourceSystem: null,
    });
    await persistSuggestions(db, workspaceId, [suggestion("C2")], () => createId("mapping"));

    const counts = await caller.mappings.counts({ workspaceId });
    expect(counts.active).toBe(1);
    expect(counts.suggested).toBe(1);
    expect(counts.deprecated).toBe(0);
  });
});
