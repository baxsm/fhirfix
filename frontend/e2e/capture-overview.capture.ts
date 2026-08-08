import { expect, test } from "@playwright/test";
import { hideDevOverlay } from "./helpers";

test.use({ deviceScaleFactor: 3, viewport: { width: 1440, height: 900 } });

const EMAIL = process.env.QA_EMAIL ?? "";
const PASSWORD = process.env.QA_PASSWORD ?? "";
const TARGET = process.env.QA_TARGET ?? "";
const OUT = process.env.QA_OUT ?? "";

test.skip(!EMAIL || !PASSWORD || !TARGET || !OUT, "set QA_EMAIL, QA_PASSWORD, QA_TARGET, QA_OUT");

test("capture a dashboard screen", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("you@company.com").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\//, { timeout: 15_000 });

  await page.goto(TARGET);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  await hideDevOverlay(page);

  await page.screenshot({ path: OUT, fullPage: false });
});
