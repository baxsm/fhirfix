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
        offenders.push(`${file}: root has a border -> "${firstClass.slice(0, 80)}"`);
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
