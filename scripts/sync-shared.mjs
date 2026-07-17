#!/usr/bin/env node
// vendors the shared db/ and engine/ source into each deployable project, so every
// project is self-contained and deploys on its own (no imports outside its folder).
//
// db/ and engine/ at the repo root are the SINGLE SOURCE OF TRUTH. this script copies
// them into <project>/src/shared/{db,engine}, which each project imports via the
// "@shared/*" tsconfig alias. run it locally after editing db/ or engine/, and it is
// wired into predev/prebuild so a normal run always has fresh copies.
//
// why vendor instead of a bun workspace: separate deploys cannot reach sibling
// packages, and the workspace also caused multiple drizzle-orm type identities to
// leak across package boundaries (turning drizzle column types into `never`). one
// copy per project fixes both.

import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// each target project gets the shared packages it actually uses.
const targets = [
  { project: "backend", shared: ["db", "engine"] },
  { project: "worker", shared: ["db", "engine"] },
];

// source layout per shared package: what to copy, and where it lands.
const sources = {
  db: { from: join(root, "db"), include: (name) => name.endsWith(".ts") || name === "schema" },
  engine: { from: join(root, "engine", "src"), include: (name) => name.endsWith(".ts") },
};

// skip tests, build artifacts, node_modules, and the drizzle migration folder
// (migrations run from the repo-root db/, not the vendored copy) in the copy.
function copyDir(from, to, include) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    if (
      name === "node_modules" ||
      name === "dist" ||
      name === "drizzle" ||
      name === "_tests" ||
      name.includes(".test.")
    ) {
      continue;
    }
    const src = join(from, name);
    const dst = join(to, name);
    const st = statSync(src);
    if (st.isDirectory()) {
      copyDir(src, dst, () => true);
    } else if (include(name)) {
      cpSync(src, dst);
    }
  }
}

// the frontend needs the backend's AppRouter type for its trpc client. unlike db/
// and engine/ this is not source we can copy - tsc emits it from the backend's
// router. so emit first, then vendor the .d.ts tree into frontend/src/shared/backend.
// without this the frontend cannot build on its own: a deployed service clones only
// its own folder, so "../backend/dist-types" does not exist.
function vendorRouterTypes() {
  const emitted = join(root, "backend", "dist-types");
  // bun ships as a real bun.exe on windows (unlike npm/pnpm, which are .cmd shims
  // and would need shell:true). so no shell here, which also keeps the args escaped.
  execFileSync("bun", ["run", "build:types"], {
    cwd: join(root, "backend"),
    stdio: "inherit",
  });
  if (!existsSync(emitted)) throw new Error(`router types not emitted: ${emitted}`);

  const dst = join(root, "frontend", "src", "shared", "backend");
  rmSync(dst, { recursive: true, force: true });
  copyDir(emitted, dst, (name) => name.endsWith(".d.ts"));
  writeFileSync(
    join(root, "frontend", "src", "shared", "README.md"),
    "# Generated - do not edit\n\nThe backend's emitted AppRouter types, copied by `scripts/sync-shared.mjs`.\nEdit the router at `backend/src/trpc/routers/`, then run `node scripts/sync-shared.mjs` (predev/prebuild run it automatically).\n",
  );
}

let count = 0;
for (const { project, shared } of targets) {
  const sharedRoot = join(root, project, "src", "shared");
  rmSync(sharedRoot, { recursive: true, force: true });
  for (const pkg of shared) {
    const { from, include } = sources[pkg];
    if (!existsSync(from)) throw new Error(`shared source missing: ${from}`);
    copyDir(from, join(sharedRoot, pkg), include);
    count++;
  }
  // a marker so it is obvious these files are generated, never hand-edited.
  writeFileSync(
    join(sharedRoot, "README.md"),
    "# Generated - do not edit\n\nThese files are copied from the repo-root `db/` and `engine/` by `scripts/sync-shared.mjs`.\nEdit the source at the repo root, then run `node scripts/sync-shared.mjs` (predev/prebuild run it automatically).\n",
  );
}

vendorRouterTypes();

console.log(
  `sync-shared: vendored ${count} shared package(s) into ${targets.length} project(s), plus router types into frontend.`,
);
