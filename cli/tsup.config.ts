import { createRequire } from "node:module";
import { defineConfig } from "tsup";

const { version } = createRequire(import.meta.url)("./package.json");

export default defineConfig({
  entry: ["src/bin.ts"],
  format: ["esm"],
  clean: true,
  target: "node18",
  platform: "node",
  noExternal: ["fhirfix"],
  define: { __CLI_VERSION__: JSON.stringify(version) },
  shims: true,
});
