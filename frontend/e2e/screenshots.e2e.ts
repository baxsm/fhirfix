import { expect, test } from "@playwright/test";
import { hideDevOverlay, latestLink } from "./helpers";

// captures key screens in dark + light for visual QA. reuses one signed-in
// workspace. artifacts land in e2e/screenshots/ (gitignored).
test("capture shell and system pages in dark and light", async ({ page }) => {
  const stamp = Date.now();
  const email = `shot-${stamp}@example.com`;
  const password = "shot-password-123";

  // sign up + verify + create workspace
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Shot User");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();

  await expect
    .poll(
      () => {
        try {
          return latestLink(/Verify your FHIRfix email/, email);
        } catch {
          return null;
        }
      },
      { timeout: 5000 },
    )
    .not.toBeNull();
  await page.goto(latestLink(/Verify your FHIRfix email/, email));

  await expect(page.getByRole("heading", { name: "Create your first workspace" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByLabel("Workspace name").fill(`Shot Health ${stamp}`);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("heading", { name: "Get started" })).toBeVisible({ timeout: 10_000 });

  const shellUrl = page.url();

  for (const theme of ["dark", "light"] as const) {
    // set next-themes' stored preference so a reload keeps the theme.
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate((t) => window.localStorage.setItem("theme", t), theme);

    // overview
    await page.goto(shellUrl);
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await page.waitForTimeout(400);
    await hideDevOverlay(page);
    await page.screenshot({ path: `e2e/screenshots/overview-${theme}.png`, fullPage: true });

    // settings
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await page.waitForTimeout(400);
    await hideDevOverlay(page);
    await page.screenshot({ path: `e2e/screenshots/settings-${theme}.png`, fullPage: true });
  }

  // a system page (404)
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await hideDevOverlay(page);
  await page.screenshot({ path: "e2e/screenshots/not-found.png", fullPage: true });
});
