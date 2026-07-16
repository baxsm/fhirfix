import { defineConfig, devices } from "@playwright/test";

// e2e assumes the backend (:3001) and frontend (:3000) are already running
// (npm run dev at the repo root starts both). Docker postgres + redis must be up.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    // overridable so the same suite can run against a production build
    // (next build && next start -p 3100), where dev-only behavior is absent.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
});
