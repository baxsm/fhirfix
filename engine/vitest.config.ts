import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // unit tests only by default; integration tests hit real sidecars and run
    // under the test:integration script.
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
  },
});
