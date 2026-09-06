import { defineConfig, devices } from "@playwright/test";

/**
 * The demo, recorded.
 *
 * The five-step script is what the whole project is judged on, and it runs
 * through a UI that changes up to the last hour. This suite exists so a late
 * change cannot break it silently — a red test the night before is recoverable,
 * a broken demo on stage is not.
 *
 * These assert specific preconditions — Priya holding asset #1, Rahul holding
 * only User — so they must run against known state, not whatever the last
 * script left behind. Run from the repo root:
 *
 *   pnpm --filter @sih26125/contracts node   # once, in another terminal
 *   pnpm e2e                                 # redeploys, reseeds, then tests
 *
 * Running `playwright test` directly skips the reset and will fail against a
 * chain some other script has already moved.
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
  projects: [
    // Signs in once; every demo test reuses the session rather than repeating a
    // login it is not testing.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "access",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "demo",
      testMatch: /demo\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
