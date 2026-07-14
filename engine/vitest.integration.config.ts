import { defineConfig } from "vitest/config";

// runs ONLY the integration tests against real sidecars. long timeouts;
// no parallelism across files so the validator pool isn't overloaded.
export default defineConfig({
  test: {
    include: ["**/*.integration.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 240_000,
    fileParallelism: false,
  },
});
