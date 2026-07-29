import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "_tests") continue;
      tsxFiles(full, out);
      continue;
    }
    if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return file.slice(SRC.length + 1).replace(/\\/g, "/");
}

// marketing runs its own visual language and is exempt from the dashboard rules
function dashboardFiles(): string[] {
  return tsxFiles(SRC).filter((f) => !rel(f).startsWith("components/marketing/"));
}

const CONTENTS_ONLY = ["empty-state.tsx"];

describe("no card in card", () => {
  it("components rendered inside a panel do not draw their own border", () => {
    const offenders: string[] = [];

    for (const file of tsxFiles(SRC)) {
      if (!CONTENTS_ONLY.some((n) => file.endsWith(n))) continue;
      const src = readFileSync(file, "utf8");
      // the container element is the first className in these components
      const firstClass = src.match(/className=\{cn\(\s*"([^"]+)"/)?.[1] ?? "";
      if (/\bborder(\s|"|$)/.test(firstClass) || /\bborder-dashed\b/.test(firstClass)) {
        offenders.push(`${rel(file)}: root has a border -> "${firstClass.slice(0, 80)}"`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("SettingsSection is the bordered panel, so its children are not", () => {
    const section = readFileSync(
      join(SRC, "components", "dashboard", "settings-section.tsx"),
      "utf8",
    );
    // if this ever stops being the bordered container, the rule above moves
    expect(section).toMatch(/rounded-lg border/);
  });

  it("EmptyState renders no border of its own", () => {
    const src = readFileSync(join(SRC, "components", "ui", "empty-state.tsx"), "utf8");
    expect(src).not.toMatch(/border-dashed/);
  });
});

describe("shared primitives are not re-implemented", () => {
  // four views each hand-rolled this identical block, so fixing one never fixed
  // the rest. ui/load-error.tsx is the one definition.
  it("no view hand-rolls the centred failed-to-load panel", () => {
    const offenders: string[] = [];

    for (const file of dashboardFiles()) {
      if (rel(file) === "components/ui/load-error.tsx") continue;
      // TODO(runs-view): last hand-rolled copy. left in place only because another
      // change was open on this file; convert to LoadError and delete this line
      if (rel(file) === "app/app/[workspace]/runs/runs-view.tsx") continue;
      const src = readFileSync(file, "utf8");
      // match per JSX block, not per file: one file can hold a legitimate empty
      // state AND a "Could not load" EmptyState without either being an offender
      for (const block of src.split(/\n(?=(?:export )?function )/)) {
        if (!/Could not load/.test(block)) continue;
        const panel = /rounded-(md|lg|xl) border[^"]*bg-card[^"]*text-center/.test(block);
        const retry = />\s*Retry\s*</.test(block);
        if (panel && retry) {
          offenders.push(`${rel(file)}: use <LoadError what="..." /> instead`);
          break;
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("a finding is not wrapped in a fixed-height scroller", () => {
    // a cap on the wrapper forces an inner scroller per finding, which steals the
    // page scroll. one report shipped with 39 nested scroll regions this way.
    const offenders: string[] = [];

    for (const file of dashboardFiles()) {
      if (!rel(file).startsWith("components/report/")) continue;
      for (const line of readFileSync(file, "utf8").split("\n")) {
        // the diff viewer's own max-h is deliberate; a flex wrapper's is not
        if (/max-h-\[\d+px\]/.test(line) && /flex-col/.test(line)) {
          offenders.push(`${rel(file)}: ${line.trim().slice(0, 70)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
