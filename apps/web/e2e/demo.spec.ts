import { expect, test } from "@playwright/test";

/**
 * The five-step demo, asserted.
 *
 * Each test names the beat it protects. If one of these goes red, the
 * corresponding moment on stage is broken.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/console");
  // Fail with a useful message rather than a confusing selector timeout when
  // the chain is not running.
  const notDeployed = page.getByText("No chain to talk to");
  if (await notDeployed.isVisible().catch(() => false)) {
    test.skip(true, "No deployment found — start a node and run deploy:local first");
  }
});

test("the pitch sentence is on the page", async ({ page }) => {
  await expect(
    page.getByRole("heading", {
      name: /Ownership, permission and history become one cryptographic object/i,
    }),
  ).toBeVisible();
});

test("step 1 — seeding registers identities and issues credentials", async ({ page }) => {
  await page.getByRole("button", { name: "Seed the demo" }).click();
  await expect(page.getByText(/Demo seeded/i)).toBeVisible();

  // Target the whole card by test id. A bare div selector matched whichever
  // nested div happened to be first, which silently changed meaning the last
  // time this markup moved — and "Manager" would have matched Priya's job
  // title rather than her credential badge.
  const priya = page.getByTestId("person-card").filter({ hasText: "Priya Menon" });
  await expect(priya.getByText("Manager", { exact: true })).toBeVisible();
});

test("step 2 — the asset appears under custody", async ({ page }) => {
  // Seeding is re-runnable and mints each time, so the table grows across runs.
  // The demo does not care how many assets exist, only that #1 is held by Priya.
  await expect(page.getByRole("cell", { name: "#1", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Priya Menon" }).first()).toBeVisible();
});

test("step 3 — a transfer to an uncredentialled recipient is blocked and explained", async ({
  page,
}) => {
  await page.locator('select[name="from"]').selectOption("manager");
  await page.locator('select[name="to"]').selectOption("user");
  await page.getByRole("button", { name: "Attempt transfer" }).click();

  // This is the twenty seconds the pitch turns on.
  await expect(page.getByRole("heading", { name: "Transfer blocked" })).toBeVisible();
  await expect(page.getByText(/never issued a Manager credential/i)).toBeVisible();

  // The revert must be decoded, not shown as raw hex.
  await expect(page.getByText("TransferBlockedRoleNeverGranted")).toBeVisible();

  // And it must say where the refusal came from.
  await expect(page.getByText(/Rejected by AssetToken\._update on chain/i)).toBeVisible();
});

test("step 4 — revoking a credential is one action and shows on the holder", async ({ page }) => {
  const revokeForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Revoke credential" }),
  });
  await revokeForm.locator('select[name="persona"]').selectOption("user");
  await revokeForm.locator('select[name="role"]').selectOption("1"); // User
  await revokeForm.getByRole("button", { name: "Revoke credential" }).click();

  await expect(page.getByText(/Credential revoked for Rahul Nair/i).first()).toBeVisible();

  await page.reload();
  const rahul = page.getByTestId("person-card").filter({ hasText: "Rahul Nair" });
  await expect(rahul).toContainText("revoked");
});

test("step 5 — the auditor replay reconstructs the history from events", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Replay the whole history" }),
  ).toBeVisible();

  // Repeated seeding means several of each of these; one is enough to prove the
  // replay reconstructs them.
  await expect(
    page.getByText(/Decentralised identity registered for Priya Menon/i).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/Manager credential issued to Priya Menon/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/Asset #1 minted to Priya Menon/i).first()).toBeVisible();

  // The claim this view exists to make.
  await expect(page.getByText(/no application database is consulted/i)).toBeVisible();
});
