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

// third-party marks only; our own line art is design work and stays off this list
const BRANDS = [
  "google",
  "github",
  "microsoft",
  "okta",
  "auth0",
  "apple",
  "slack",
  "stripe",
  "polar",
  "epic",
  "cerner",
];

describe("brand assets are sourced, never redrawn", () => {
  // a hand-written mark can carry the right brand hexes and invented geometry
  it("a file drawing a third-party mark cites where the asset came from", () => {
    const offenders: string[] = [];

    for (const file of tsxFiles(SRC)) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("<path")) continue;

      const name = rel(file).toLowerCase();
      const brand = BRANDS.find((b) => name.includes(b));
      if (!brand) continue;

      // must anchor to a comment-leading domain: every svg carries an xmlns url
      const cited = src
        .split("\n")
        .some((line) => /^\s*(\/\/|\*)/.test(line) && /\b[a-z0-9-]+\.[a-z]{2,}\/\S+/.test(line));
      if (!cited) {
        offenders.push(
          `${rel(file)}: draws the ${brand} mark with no source url in a comment. ` +
            `fetch the official asset (svgl.app or the vendor's own cdn) instead of redrawing it.`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });

  // the current mark is gradient-based, so flat brand hexes mean a stale approximation
  it("the google mark is svgl's current asset, not a flattened redraw", () => {
    const src = readFileSync(join(SRC, "app", "(auth)", "google-mark.tsx"), "utf8");
    expect(src).toContain('viewBox="0 0 268.152 273.883"');
    expect(src).toContain("svgl.app/library/google.svg");
    // the old flat four-colour approximation had exactly these as plain fills
    const flatFills = ['fill="#4285F4"', 'fill="#34A853"', 'fill="#EA4335"'];
    expect(flatFills.filter((f) => src.includes(f))).toEqual([]);
  });
});
