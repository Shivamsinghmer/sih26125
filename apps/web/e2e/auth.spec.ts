import { expect, test } from "@playwright/test";

/**
 * The access boundary.
 *
 * These run without a stored session on purpose — they exist to prove the
 * middleware turns people away, which a suite that is already signed in can
 * never demonstrate.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const ADMIN_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
/** Hardhat account #9 — a real key that holds no credential on this chain. */
const STRANGER_KEY = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";
/** Hardhat account #3 — K. Iyer, who holds the Auditor credential. */
const AUDITOR_KEY = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";

test("the landing page is public", async ({ page }) => {
  await page.goto("/");
  // The hero states the mechanism; the committed pitch sentence closes the page.
  await expect(
    page.getByRole("heading", {
      name: /The asset refuses to move without a valid credential/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Ownership, permission and history become one cryptographic object/i),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
});

for (const path of ["/console", "/gate", "/audit"]) {
  test(`${path} redirects a signed-out visitor to the login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
  });
}

test("a key with no on-chain credential is refused, however valid the signature", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Private key").fill(STRANGER_KEY);
  await page.getByLabel(/Passphrase to encrypt/).fill("demo-passphrase");
  await page.getByRole("button", { name: "Store key and sign in" }).click();

  // The signature is genuine — the chain simply records nothing for this
  // address, which is the point: authority comes from the chain, not the key.
  await expect(page.locator('form p[role="alert"]')).toContainText(
    /no Admin or Auditor credential/i,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("a wrong passphrase does not unlock the stored key", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Private key").fill(ADMIN_KEY);
  await page.getByLabel(/Passphrase to encrypt/).fill("correct-passphrase");
  await page.getByRole("button", { name: "Store key and sign in" }).click();
  await page.waitForURL("**/console");

  // Come back with the key still in the browser and get the passphrase wrong.
  await page.goto("/login");
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Passphrase", { exact: true }).fill("wrong-passphrase");
  await page.getByRole("button", { name: "Unlock and sign in" }).click();

  await expect(page.locator('form p[role="alert"]')).toContainText(/does not unlock/i);
});

test("a terminal reaches the gate and is kept out of the console", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Terminal ID").fill("gate-3");
  await page.getByLabel("Password").fill("gate-post-3");
  await page.getByRole("button", { name: "Sign in as terminal" }).click();

  await page.waitForURL("**/gate");
  await expect(page.getByRole("heading", { name: "Gate check" })).toBeVisible();

  // The nav must not offer what the role cannot open.
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  // And asking for it directly lands back on their own surface, not an error.
  await page.goto("/console");
  await expect(page).toHaveURL(/\/gate/);
});

test("a wrong terminal password is refused without saying which half was wrong", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Terminal ID").fill("gate-3");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in as terminal" }).click();

  // Scoped to the form's own alert: Next injects a route announcer that also
  // carries role="alert", so a bare getByRole("alert") matches two elements.
  await expect(page.locator('form p[role="alert"]')).toHaveText(/do not match/i);
  await expect(page).toHaveURL(/\/login/);
});

test("an auditor reaches the replay and nothing that changes state", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Private key").fill(AUDITOR_KEY);
  await page.getByLabel(/Passphrase to encrypt/).fill("demo-passphrase");
  await page.getByRole("button", { name: "Store key and sign in" }).click();

  // Their role comes from the chain, not from anything chosen at sign-in.
  await page.waitForURL("**/audit");
  await expect(page.getByRole("heading", { name: "Replay the whole history" })).toBeVisible();

  // An auditor who can also issue credentials is not an auditor.
  await expect(page.getByRole("button", { name: /Revoke credential/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  await page.goto("/console");
  await expect(page).toHaveURL(/\/audit/);
});
