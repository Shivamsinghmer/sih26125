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
  const notDeployed = page.getByText("The shared record cannot be reached");
  if (await notDeployed.isVisible().catch(() => false)) {
    test.skip(true, "No deployment found — start a node and run deploy:local first");
  }
});

test("the dashboard opens on where everything stands", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  // Was `getByText("Recorded events")`, a static tile label. The dashboard
  // now leads with the activity chart, so assert on its readout: a count that
  // only renders if events were actually read off the chain.
  await expect(page.getByText(/\d+ changes recorded/).first()).toBeVisible();
  await expect(page.getByText("Equipment and who holds it")).toBeVisible();
});

test("step 1 — seeding registers identities and issues credentials", async ({ page }) => {
  await page.goto("/console/people");
  await page.getByRole("button", { name: "Load the example data" }).click();
  // Slow, but not for the reason it looks. Measured server-side, the action
  // body is ~0.5s (nine transactions) and revalidation is ~0ms; the rest is
  // Next's dev-mode re-render of the route in the action response. A production
  // build does not pay it, so this timeout covers dev, not a real cost.
  await expect(page.getByText(/Example data loaded/i)).toBeVisible({ timeout: 60_000 });

  // Target the whole card by test id. A bare div selector matched whichever
  // nested div happened to be first, which silently changed meaning the last
  // time this markup moved — and the clearance name would have matched a job
  // title rather than her credential badge.
  const priya = page.getByTestId("person-card").filter({ hasText: "Priya Menon" });
  await expect(priya.getByText("Secret", { exact: true })).toBeVisible();
});

test("step 2 — the asset appears under custody", async ({ page }) => {
  await page.goto("/console/assets");
  // Seeding is re-runnable and mints each time, so the table grows across runs.
  // The demo does not care how many assets exist, only that #1 is held by Priya.
  //
  // Matched on a trailing "#1" rather than an exact cell: the item column names
  // the equipment now, so the cell reads "Item #1" for a token with no recorded
  // description and "<name><serial> · #1" for one that has it. Anchoring to the
  // end keeps it from also matching #10.
  await expect(page.getByRole("cell", { name: /#1$/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Priya Menon" }).first()).toBeVisible();

  // Depends on step 1 having seeded, like step 3 does. It is worth the coupling:
  // this is the only assertion that the name survives the whole round trip —
  // typed in, hashed into the token's metadataHash, stored in Postgres, and
  // joined back onto the on-chain asset by token id.
  await expect(page.getByText("Signal Analyser").first()).toBeVisible();
});

test("step 3 — a transfer to an uncredentialled recipient is blocked and explained", async ({
  page,
}) => {
  await page.goto("/console/transfers");
  await page.locator('select[name="from"]').selectOption("manager");
  await page.locator('select[name="to"]').selectOption("user");
  await page.getByRole("button", { name: "Hand over" }).click();

  // This is the twenty seconds the pitch turns on.
  await expect(page.getByRole("heading", { name: "Handover blocked" })).toBeVisible();
  await expect(page.getByText(/never been given a Secret clearance/i)).toBeVisible();

  // The revert must be decoded, not shown as raw hex.
  await expect(page.getByText("TransferBlockedRoleNeverGranted")).toBeVisible();

  // And it must say that the refusal is not this screen being fussy — that no
  // account can push it through is the whole claim.
  await expect(page.getByText(/refused by the shared record itself/i)).toBeVisible();
});

test("step 4 — revoking a credential is one action and shows on the holder", async ({ page }) => {
  await page.goto("/console/credentials");
  const revokeForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Take clearance away" }),
  });
  await revokeForm.locator('select[name="persona"]').selectOption("user");
  await revokeForm.locator('select[name="role"]').selectOption("1"); // User
  await revokeForm.getByRole("button", { name: "Take clearance away" }).click();

  await expect(
    page.getByText(/Clearance taken away from Rahul Nair/i).first(),
  ).toBeVisible();

  // The badge lives on the People page, not on the form that changed it.
  await page.goto("/console/people");
  const rahul = page.getByTestId("person-card").filter({ hasText: "Rahul Nair" });
  await expect(rahul).toContainText("taken away");
});

test("step 5 — the auditor replay reconstructs the history from events", async ({ page }) => {
  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

  // Searched rather than read off page one. Seeding is re-runnable by design, so
  // a chain that has been demoed a few times pushes the oldest events past the
  // first page — which made this fail for a reason that had nothing to do with
  // what it protects. Filtering asks the whole trail, which is the real claim.
  for (const phrase of [
    "Digital ID created for Priya Menon",
    "Secret clearance given to Priya Menon",
    "Item #1 added and given to Priya Menon",
  ]) {
    await page.getByLabel("Search").fill(phrase);
    await expect(page.getByText(phrase, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  // The claim this view exists to make, now said without the jargon.
  await expect(
    page.getByText(/built from the record of the work itself/i),
  ).toBeVisible();
});

test("the audit trail can be filtered, searched and paged", async ({ page }) => {
  await page.goto("/audit");

  const rows = page.locator("ol > li");
  const unfiltered = await rows.count();
  expect(unfiltered).toBeGreaterThan(0);

  // Narrowing by contract must reduce the set, not merely relabel it — and it
  // applies on change, with no submit to press.
  // The stored value stays technical so shared links keep working; only the
  // label a reader sees was translated.
  await page.getByLabel("Area").selectOption("RoleRegistry");
  await expect(page).toHaveURL(/contract=RoleRegistry/);
  await expect(page.getByText(/of \d+ changes match/)).toBeVisible();
  await expect(page.locator("ol > li").first()).toContainText(/clearance/i);

  // Typing filters without a submit, after its debounce.
  await page.goto("/audit");
  await page.getByLabel("Search").fill("zzz-no-such-thing");
  // 250ms debounce plus a dev-mode re-render, which is seconds under load.
  await expect(page).toHaveURL(/q=zzz-no-such-thing/, { timeout: 30_000 });
  await expect(page.getByText("Nothing matches what you searched for")).toBeVisible();

  // Clearing restores the full record.
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page).toHaveURL(/\/audit$/);

  // Paging keeps the active filter rather than silently resetting it.
  await page.goto("/audit?contract=RoleRegistry");
  const older = page.getByRole("link", { name: /Older/ });
  if (await older.count()) {
    await older.click();
    await expect(page).toHaveURL(/contract=RoleRegistry/);
    await expect(page).toHaveURL(/page=2/);
  }
});
