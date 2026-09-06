import { defineConfig, devices } from "@playwright/test";

/**
 * The demo, recorded.
 *
 * The five-step script is what the whole project is judged on, and it runs
 * through a UI that changes up to the last hour. This suite exists so a late
 * change cannot break it silently — a red test the night before is recoverable,
 * a broken demo on stage is not.
 *
 * Needs a chain and a deployment first:
 *   pnpm --filter @sih26125/contracts node
 *   pnpm --filter @sih26125/contracts deploy:local
 *   pnpm --filter @sih26125/chain seed
 */
export default defineConfig({
  testDir: "./e2e",
  // The demo is a sequence — a blocked transfer depends on the seed before it —
  // so these must not race each other.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
