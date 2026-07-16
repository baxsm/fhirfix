import { defineConfig } from "tsup";

// the CLI is an executable, not a library: bundle the SDK in rather than declaring
// it as a runtime dep. `npx fhirfix` in CI then downloads one package, not two,
// and the action's install step stays fast.
export default defineConfig({
  entry: ["src/bin.ts"],
  format: ["esm"],
  clean: true,
  target: "node18",
  platform: "node",
  noExternal: ["fhirfix"],
  // no banner here: src/bin.ts already carries the shebang and tsup preserves it.
  // adding one emits it twice, and the second line is a syntax error that kills
  // the binary on startup - invisible to unit tests, fatal to every real user.
  shims: true,
});
