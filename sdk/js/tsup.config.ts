import { defineConfig } from "tsup";

// dual ESM + CJS. the big SDKs (stripe, anthropic) both ship dual rather than
// ESM-only, and a CI/CLI consumer on require() is exactly our audience.
// tsup emits the matching .d.ts / .d.cts pair that the exports map points at.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: "es2022",
  outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" }),
});
