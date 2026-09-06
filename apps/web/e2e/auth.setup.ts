import { expect, test as setup } from "@playwright/test";

/**
 * Sign in once as the issuing authority and save the session, so every demo
 * test starts authenticated rather than repeating a login it is not testing.
 *
 * This drives the real key-based path — enrol the key, encrypt it under a
 * passphrase, sign the server's challenge — rather than forging a cookie, so
 * the flow a judge will use is exercised on every run.
 */
const ADMIN_STATE = "playwright/.auth/admin.json";

/** Hardhat account #0, the issuing authority. Published; worthless off-chain. */
const ADMIN_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

setup("authenticate as the issuing authority", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Private key").fill(ADMIN_KEY);
  await page.getByLabel(/Passphrase to encrypt/).fill("demo-passphrase");
  await page.getByRole("button", { name: "Store key and sign in" }).click();

  await page.waitForURL("**/console");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

  // The keystore lives in localStorage, so origins have to be captured too or
  // the saved state signs in but cannot unlock on reuse.
  await page.context().storageState({ path: ADMIN_STATE });
});
