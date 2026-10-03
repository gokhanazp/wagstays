import { defineConfig, devices } from "@playwright/test";

/**
 * Anonymous smoke tests against a deployed site (no credentials, no database writes).
 *   E2E_BASE_URL=https://wagstays.vercel.app npm run test:e2e
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://wagstays.vercel.app",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
