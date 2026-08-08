import { expect, test } from "@playwright/test";
import { hideDevOverlay } from "./helpers";

// 3x so the asset stays sharp at the full-bleed width the landing renders it at.
test.use({ deviceScaleFactor: 3, viewport: { width: 1440, height: 900 } });

const EMAIL = process.env.QA_EMAIL ?? "";
const PASSWORD = process.env.QA_PASSWORD ?? "";
const RUN_PATH = process.env.QA_RUN ?? "";

test.skip(!EMAIL || !PASSWORD || !RUN_PATH, "set QA_EMAIL, QA_PASSWORD and QA_RUN");

test("capture report hero", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("you@company.com").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\//, { timeout: 15_000 });

  await page.goto(RUN_PATH);
  // a data hook, not utility classes: a restyle must not silently break the capture
  await expect(page.locator("[data-finding-detail]").first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);
  await hideDevOverlay(page);

  await page.screenshot({ path: "public/report-hero.png", fullPage: false });
});
