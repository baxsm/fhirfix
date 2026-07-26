import { describe, expect, test } from "bun:test";
import { type ConflictCandidate, findConflicts } from "../mapping-conflicts";

function row(over: Partial<ConflictCandidate> = {}): ConflictCandidate {
  return {
    id: "map_1",
    scope: "workspace",
    sourceSystem: null,
    type: "authority_to_system",
    sourceValue: "MRN",
    targetValue: "http://a",
    ...over,
  };
}

describe("findConflicts", () => {
  test("no conflict for a single mapping", () => {
    expect(findConflicts([row()])).toEqual([]);
  });

  test("no conflict between different source values", () => {
    const rows = [row({ id: "a" }), row({ id: "b", sourceValue: "SSN" })];
    expect(findConflicts(rows)).toEqual([]);
  });

  test("no conflict between different types on the same source value", () => {
    const rows = [row({ id: "a" }), row({ id: "b", type: "code_to_code" })];
    expect(findConflicts(rows)).toEqual([]);
  });

  test("flags a source-system row shadowing a workspace row", () => {
    const general = row({ id: "general" });
    const scoped = row({ id: "scoped", scope: "source_system", sourceSystem: "epic" });
    const out = findConflicts([general, scoped]);
    expect(out).toHaveLength(1);
    expect(out[0]?.winner.id).toBe("scoped");
    expect(out[0]?.overridden.map((r) => r.id)).toEqual(["general"]);
  });

  // each run names one source system, so it only ever loads one of these.
  test("two source-system rows on different feeds do not conflict", () => {
    const rows = [
      row({ id: "a", scope: "source_system", sourceSystem: "epic" }),
      row({ id: "b", scope: "source_system", sourceSystem: "cerner" }),
    ];
    expect(findConflicts(rows)).toEqual([]);
  });

  test("reports one conflict per shadowing feed", () => {
    const rows = [
      row({ id: "general" }),
      row({ id: "epic", scope: "source_system", sourceSystem: "epic" }),
      row({ id: "cerner", scope: "source_system", sourceSystem: "cerner" }),
    ];
    const out = findConflicts(rows);
    expect(out.map((c) => c.winner.id).sort()).toEqual(["cerner", "epic"]);
  });

  test("the scoped row is always the winner, whatever the input order", () => {
    const general = row({ id: "general" });
    const scoped = row({ id: "scoped", scope: "source_system", sourceSystem: "epic" });
    expect(findConflicts([scoped, general])[0]?.winner.id).toBe("scoped");
    expect(findConflicts([general, scoped])[0]?.winner.id).toBe("scoped");
  });

  test("carries the values through so the ui can show what differs", () => {
    const rows = [
      row({ id: "general", targetValue: "http://general" }),
      row({
        id: "scoped",
        scope: "source_system",
        sourceSystem: "epic",
        targetValue: "http://scoped",
      }),
    ];
    const c = findConflicts(rows)[0];
    expect(c?.winner.targetValue).toBe("http://scoped");
    expect(c?.overridden[0]?.targetValue).toBe("http://general");
    expect(c?.winner.sourceSystem).toBe("epic");
  });
});
