import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * a static scan, not a runtime guard.
 *
 * code-style.md asks for exactly this and says runtime nesting checks are too
 * fragile. it was never written, which is how `EmptyState` shipped with its own
 * dashed border while all four of its callers render it inside SettingsSection
 * (already `rounded-lg border`) - a box drawn inside a box on the developers
 * page.
 *
 * the rule: a component that is ALWAYS rendered inside a bordered panel must
 * not draw its own border. the panel is the container; the component is its
 * contents.
 */

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

/** components whose every caller wraps them in a bordered panel. */
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
