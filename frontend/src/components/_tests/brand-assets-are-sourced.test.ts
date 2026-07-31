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

// third-party marks whose geometry belongs to someone else. our own line art is
// not on this list: drawing a chart line or a document outline is design work,
// redrawing another company's logo from memory is a brand violation.
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
  // this test exists because a google "G" was once hand-written from memory and
  // shipped. the four brand hexes were right and the path geometry was invented.
  it("a file drawing a third-party mark cites where the asset came from", () => {
    const offenders: string[] = [];

    for (const file of tsxFiles(SRC)) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("<path")) continue;

      const name = rel(file).toLowerCase();
      const brand = BRANDS.find((b) => name.includes(b));
      if (!brand) continue;

      // a citation is a url in a comment naming where the paths were taken from
      const cited = /\/\/[^\n]*https?:\/\/\S+/.test(src) || /\*[^\n]*https?:\/\/\S+/.test(src);
      if (!cited) {
        offenders.push(
          `${rel(file)}: draws the ${brand} mark with no source url in a comment. ` +
            `fetch the official asset (svgl.app or the vendor's own cdn) instead of redrawing it.`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });

  // the specific asset that caused the rule. it was shipped twice wrong: first
  // as invented path geometry, then as a real-but-superseded flat logo. the
  // current mark is gradient-based, so a file of flat brand hexes means someone
  // has "simplified" it back to a stale approximation.
  it("the google mark is svgl's current asset, not a flattened redraw", () => {
    const src = readFileSync(join(SRC, "app", "(auth)", "google-mark.tsx"), "utf8");
    expect(src).toContain('viewBox="0 0 268.152 273.883"');
    expect(src).toContain("svgl.app/library/google.svg");
    // the old flat four-colour approximation had exactly these as plain fills
    const flatFills = ['fill="#4285F4"', 'fill="#34A853"', 'fill="#EA4335"'];
    expect(flatFills.filter((f) => src.includes(f))).toEqual([]);
  });
});
