import { expect, test } from "@playwright/test";

/**
 * The access boundary.
 *
 * These run without a stored session on purpose — they exist to prove the
 * middleware turns people away, which a suite that is already signed in can
 * never demonstrate.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("the landing page is public", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Ownership, permission and history become one cryptographic object/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
});

for (const path of ["/console", "/gate", "/audit"]) {
  test(`${path} redirects a signed-out visitor to the login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
  });
}

test("a wrong password is refused without saying which half was wrong", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Scoped to the form's own alert: Next injects a route announcer that also
  // carries role="alert", so a bare getByRole("alert") matches two elements.
  await expect(page.locator('form p[role="alert"]')).toHaveText(/do not match/i);
  await expect(page).toHaveURL(/\/login/);
});

test("a guard reaches the gate and is kept out of the console", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("guard");
  await page.getByLabel("Password").fill("guard123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("**/gate");
  await expect(page.getByRole("heading", { name: "Gate check" })).toBeVisible();

  // The nav must not offer what the role cannot open.
  await expect(page.getByRole("link", { name: "Console" })).toHaveCount(0);

  // And asking for it directly lands back on their own surface, not an error.
  await page.goto("/console");
  await expect(page).toHaveURL(/\/gate/);
});

test("an auditor gets the replay and nothing that changes state", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("auditor");
  await page.getByLabel("Password").fill("auditor123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("**/audit");
  await expect(page.getByRole("heading", { name: "Replay the whole history" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Revoke credential/ })).toHaveCount(0);
});
