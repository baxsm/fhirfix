import { expect, test } from "@playwright/test";
import { hideDevOverlay, latestLink } from "./helpers";

// full phase-1 flow against the real frontend + backend + postgres.
// run with: EMAIL_CAPTURE_FILE=<path> npx playwright test
test("sign up, verify, create workspace, reach dashboard, switch theme", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-${stamp}@example.com`;
  const password = "e2e-password-123";

  // sign up
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  // lands on verify-email
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();

  // grab the verify link from the captured email and open it
  await expect
    .poll(() => tryLink(/Verify your FHIRfix email/, email), { timeout: 5000 })
    .not.toBeNull();
  const verifyUrl = latestLink(/Verify your FHIRfix email/, email);
  await page.goto(verifyUrl);

  // auto-signed-in and sent to create-first-workspace
  await expect(page.getByRole("heading", { name: "Create your first workspace" })).toBeVisible({
    timeout: 10_000,
  });

  // create the workspace
  await page.getByLabel("Workspace name").fill(`E2E Health ${stamp}`);
  await page.getByRole("button", { name: "Create workspace" }).click();

  // dashboard overview
  await expect(page.getByRole("heading", { name: "Get started" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();

  // switch theme on settings
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);

  await hideDevOverlay(page);
});

function tryLink(re: RegExp, to?: string): string | null {
  try {
    return latestLink(re, to);
  } catch {
    return null;
  }
}
