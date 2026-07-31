import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_ACTIONS } from "@shared/db/schema";

const BACKEND_SRC = join(import.meta.dir, "..", "..");
const WORKER_SRC = join(BACKEND_SRC, "..", "..", "worker", "src");
const AUDIT_LABELS = join(
  BACKEND_SRC,
  "..",
  "..",
  "frontend",
  "src",
  "components",
  "audit",
  "audit-labels.ts",
);

function tsFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // shared/ is a vendored copy of db/, so it holds the enum, never a writer
      if (entry === "node_modules" || entry === "_tests" || entry === "shared") continue;
      tsFiles(full, out);
      continue;
    }
    if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

// every action string that appears as `action: "..."` in a writeAudit call.
function writtenActions(): Set<string> {
  const found = new Set<string>();
  for (const file of [...tsFiles(BACKEND_SRC), ...tsFiles(WORKER_SRC)]) {
    const src = readFileSync(file, "utf8");
    for (const match of src.matchAll(/action:\s*"([a-z._]+)"/g)) {
      const action = match[1];
      if (action) found.add(action);
    }
  }
  return found;
}

describe("audit coverage", () => {
  // an action in the enum with no writer is a filter in the audit UI that can
  // never match. report.downloaded, report.exported and packet.exported all
  // shipped this way: labelled in the dropdown, never once recorded.
  test("every declared action has a writer", () => {
    const written = writtenActions();
    const orphans = AUDIT_ACTIONS.filter((a) => !written.has(a));
    expect(orphans).toEqual([]);
  });

  // the reverse: a writer using a string not in the enum would insert a row the
  // UI cannot label, and the $type cast means TS would not catch a stale slug.
  test("no writer invents an action outside the enum", () => {
    const declared = new Set<string>(AUDIT_ACTIONS);
    const suspects: string[] = [];

    for (const file of [...tsFiles(BACKEND_SRC), ...tsFiles(WORKER_SRC)]) {
      const src = readFileSync(file, "utf8");
      // only look at action strings that sit inside a writeAudit call, so an
      // unrelated `action: "create"` elsewhere is not a false positive
      for (const call of src.matchAll(/writeAudit\(\s*\{[\s\S]{0,400}?\}/g)) {
        const action = call[0].match(/action:\s*"([a-z._]+)"/)?.[1];
        if (action && !declared.has(action)) {
          suspects.push(`${file}: ${action}`);
        }
      }
    }

    expect(suspects).toEqual([]);
  });

  // a run created through the api went unaudited for a whole phase while the
  // identical run from the dashboard wrote a row. an auditor asking "who touched
  // this data" must get the same answer regardless of which door was used.
  test("every sensitive api-v1 controller writes an audit row", () => {
    const required = [
      // validate/fix/convert all funnel through this one shared helper
      { file: "controllers.ts", fn: "runAndPersist", action: "run.created" },
      { file: "runs.ts", fn: "batchController", action: "run.created" },
      { file: "runs.ts", fn: "getCorrectedController", action: "report.downloaded" },
      { file: "report.ts", fn: "getReportController", action: "report.exported" },
    ];
    const missing: string[] = [];

    for (const { file, fn, action } of required) {
      const src = readFileSync(join(BACKEND_SRC, "routes", "api-v1", file), "utf8");
      // slice from the function to the next top-level declaration
      const start = src.indexOf(fn);
      if (start === -1) {
        missing.push(`${file}: ${fn} not found (renamed? update this test)`);
        continue;
      }
      const rest = src.slice(start);
      const end = rest.search(/\n(?:export )?(?:async )?function /);
      const body = end === -1 ? rest : rest.slice(0, end);
      if (!body.includes(`action: "${action}"`)) {
        missing.push(`${file}:${fn} does not write ${action}`);
      }
    }

    expect(missing).toEqual([]);
  });

  // the audit page renders ACTION_LABELS[action]. a missing entry renders the
  // raw slug to whoever is answering an auditor.
  test("every declared action has a human label", () => {
    const labels = readFileSync(AUDIT_LABELS, "utf8");
    // a dotless slug is a valid identifier, so it is written as a bare key
    const unlabelled = AUDIT_ACTIONS.filter(
      (a) => !labels.includes(`"${a}":`) && !new RegExp(`^\\s*${a}:`, "m").test(labels),
    );
    expect(unlabelled).toEqual([]);
  });
});
