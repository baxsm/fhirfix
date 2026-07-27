import { expect, test } from "@playwright/test";
import { hideDevOverlay } from "./helpers";

// retina-crisp: capture at 2x so the asset stays sharp when scaled in the panel.
test.use({ deviceScaleFactor: 2, viewport: { width: 1440, height: 900 } });

test("capture report hero for auth panel", async ({ page }) => {
  const email = process.env.QA_EMAIL ?? "phase2-qa@fhirfix.local";
  const password = process.env.QA_PASSWORD ?? "phase2-qa-pass-123";
  const runPath =
    process.env.QA_RUN ?? "/app/phase2-health/runs/run_nx458uh3ig8j5puxwkz0";

  // dark mode: the product is dark-first and the red->green report reads best dark.
  await page.emulateMedia({ colorScheme: "dark" });

  await page.goto("/sign-in");
  await page.evaluate(() => window.localStorage.setItem("theme", "dark"));
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\//, { timeout: 15_000 });

  await page.goto(runPath);
  await expect(page.locator("html")).toHaveClass(/dark/);
  // wait for the ranked findings to render.
  await expect(page.locator("article").first()).toBeVisible({ timeout: 15_000 });

  // expand the first finding so the crop shows the signature before/after diff.
  await page.locator("article button[aria-expanded]").first().click();
  await page.waitForTimeout(450);
  await hideDevOverlay(page);

  const clip = await page.evaluate(() => {
    const article = document.querySelector("article");
    if (!article) return null;
    let col: HTMLElement = article;
    for (let i = 0; i < 5 && col.parentElement; i++) col = col.parentElement;
    const colRect = col.getBoundingClientRect();
    const firstRect = article.getBoundingClientRect();
    const pad = 20;
    const top = Math.max(0, colRect.y + pad);
    // end a little below the first finding so its diff + a hint of the next row show.
    const bottom = firstRect.bottom + 28;
    return {
      x: Math.max(0, colRect.x + pad),
      y: top,
      width: colRect.width - pad * 2,
      height: bottom - top,
    };
  });
  if (!clip) throw new Error("report column not found");

  await page.screenshot({ path: "public/auth-report.png", clip });
});
