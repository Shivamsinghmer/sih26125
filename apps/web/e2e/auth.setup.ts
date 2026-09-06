import { expect, test as setup } from "@playwright/test";

/**
 * Sign in once and save the session, so every demo test starts authenticated
 * rather than repeating a login it is not trying to test.
 *
 * The demo suite runs as the issuing authority, which is the only role that can
 * reach all five steps.
 */
const ADMIN_STATE = "playwright/.auth/admin.json";

setup("authenticate as the issuing authority", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Landing on /console is the proof the session took; a failed login stays put.
  await page.waitForURL("**/console");
  await expect(page.getByRole("link", { name: "Console" })).toBeVisible();

  await page.context().storageState({ path: ADMIN_STATE });
});
