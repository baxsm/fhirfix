import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/_tests/**/*.test.{ts,tsx}"],
    // any component importing @/lib/env would otherwise throw "Invalid
    // environment variables" on import, before a single assertion runs.
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
      NEXT_PUBLIC_GOOGLE_ENABLED: "true",
    },
  },
});
