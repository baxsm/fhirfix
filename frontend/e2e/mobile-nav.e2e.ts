import { expect, test } from "@playwright/test";

// 375px is the iPhone SE width and the narrowest viewport we support.
const MOBILE = { width: 375, height: 812 };

const EMAIL = process.env.QA_EMAIL ?? "";
const PASSWORD = process.env.QA_PASSWORD ?? "";
const WORKSPACE = process.env.QA_WORKSPACE ?? "";

test.skip(!EMAIL || !PASSWORD || !WORKSPACE, "set QA_EMAIL, QA_PASSWORD and QA_WORKSPACE");

test.use({ viewport: MOBILE });

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app\//);
});

test("the page never scrolls sideways at 375px", async ({ page }) => {
  await page.goto(`/app/${WORKSPACE}`);
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("every nav destination is reachable at 375px", async ({ page }) => {
  await page.goto(`/app/${WORKSPACE}`);
  await page.waitForLoadState("networkidle");

  // the rail is hidden this narrow, so the trigger is the only way in. a layout
  // that merely looks right but strands the nav behind it is the failure here
  const trigger = page.getByRole("button", { name: /menu|navigation/i }).first();
  await expect(trigger).toBeVisible();
  await trigger.click();

  for (const label of ["Overview", "New check", "Runs", "Billing", "Settings"]) {
    await expect(page.getByRole("button", { name: label })).toBeVisible();
  }
});

test("choosing a destination closes the sheet and leaves the page usable", async ({ page }) => {
  await page.goto(`/app/${WORKSPACE}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /menu|navigation/i }).first().click();
  await page.getByRole("button", { name: "Runs" }).click();
  await page.waitForURL(/\/runs/);

  // the overlay used to stay mounted after navigating and swallowed every tap
  const blocked = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return el?.closest("[data-slot=sheet-overlay],[data-radix-dialog-overlay]") !== null;
  });
  expect(blocked).toBe(false);
});
