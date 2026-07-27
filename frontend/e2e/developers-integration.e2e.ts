import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { hideDevOverlay, latestLink } from "./helpers";


const CLI_BIN = resolve(process.cwd(), "../cli/dist/bin.js");
const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:3001/api/v1";

const BROKEN = {
  resourceType: "Patient",
  id: "e2e-gate",
  text: {
    status: "generated",
    div: '<div xmlns="http://www.w3.org/1999/xhtml">Jane Doe</div>',
  },
  identifier: [{ system: "http://northwind-health.org/fhir/sid/mrn", value: "e2e-12345" }],
  gender: "M",
  name: [{ family: "Doe", given: ["Jane"] }],
};

test("create a key in the dashboard, use it in the API explorer, gate a build with the CLI", async ({
  page,
}) => {
  const stamp = Date.now();
  const email = `e2e-dev-${stamp}@example.com`;
  const password = "e2e-password-123";
  const workDir = mkdtempSync(join(tmpdir(), "fhirfix-e2e-"));

  try {
    // ---- sign up and land in a real workspace (trial credits granted on create) ----
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("E2E Dev");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
    await expect
      .poll(() => tryLink(/Verify your FHIRfix email/, email), { timeout: 5000 })
      .not.toBeNull();
    await page.goto(latestLink(/Verify your FHIRfix email/, email));

    await expect(page.getByRole("heading", { name: "Create your first workspace" })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByLabel("Workspace name").fill(`E2E Dev Health ${stamp}`);
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page.getByRole("heading", { name: "Get started" })).toBeVisible({
      timeout: 10_000,
    });
    // the form slugifies the name; the dashboard lives under that slug.
    const slug = `e2e-dev-health-${stamp}`;
    expect(page.url()).toContain(slug);

    // ---- create a TEST key by clicking, exactly as a developer would ----
    await page.getByRole("link", { name: "Developers" }).click();
    await expect(page.getByRole("heading", { name: "Developers" })).toBeVisible();

    await expect(page.locator("header p").first()).toContainText(`E2E Dev Health ${stamp}`);

    // a brand-new workspace has no keys: the empty state, not the table.
    await expect(page.getByText("No API keys yet")).toBeVisible();
    await page.getByRole("button", { name: "Create your first key" }).click();

    await expect(page.getByRole("heading", { name: "Create API key" })).toBeVisible();
    await page.getByLabel("Name").fill("E2E CI key");
    await page.getByRole("button", { name: "Create key" }).click();

    // shown-once dialog: read the real key out of it.
    await expect(page.getByRole("heading", { name: "Copy your test key" })).toBeVisible({
      timeout: 10_000,
    });
    const testKey = (await page.locator("code.select-all").innerText()).trim();
    expect(testKey).toMatch(/^ffx_test_/);

    await page.getByRole("button", { name: "Done" }).click();

    // after closing, the full key is gone: masked prefix only, never the secret.
    await expect(page.getByText("E2E CI key")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(testKey);

    // ---- use that key in the API explorer: a real authenticated request ----
    await page.goto("/docs/api-explorer");
    await page.getByLabel("Test API key").fill(testKey);
    await page.getByRole("button", { name: "Send request" }).click();

    // the engine really ran: 200 with a runId, from a key made by clicking.
    await expect(page.getByText("200", { exact: true })).toBeVisible({ timeout: 30_000 });
    const body = await page.locator("pre").last().innerText();
    expect(body).toContain("runId");

    await hideDevOverlay(page);

    // ---- the same key gates a real CLI build: red, then green after the fix ----
    const brokenFile = join(workDir, "patient.json");
    writeFileSync(brokenFile, JSON.stringify(BROKEN, null, 2));

    // red: findings trip the gate (exit 1).
    const red = runCli(["validate", brokenFile], testKey);
    expect(red.code).toBe(1);

    // fix --out writes the corrected resource.
    const fixedFile = join(workDir, "patient.fixed.json");
    const fix = runCli(["fix", brokenFile, "--out", fixedFile], testKey);
    expect(fix.code).toBe(0);

    // the fix is real, not just an exit code: "M" -> "male".
    const fixed = JSON.parse(readFileSync(fixedFile, "utf8"));
    expect(fixed.gender).toBe("male");

    // green: the corrected file passes the same gate that just failed.
    const green = runCli(["validate", fixedFile], testKey);
    expect(green.code).toBe(0);

    // ---- the traffic shows up in the dashboard request logs ----
    await page.goto(`/app/${slug}/developers`);
    await expect(page.getByRole("heading", { name: "Developers" })).toBeVisible();
    await expect(page.getByText("/api/v1/validate").first()).toBeVisible({ timeout: 15_000 });

    // the key that was "Never used" now reports a real last-used time.
    await expect(page.getByText("Never", { exact: true })).toHaveCount(0);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});

function runCli(args: string[], apiKey: string): { code: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [CLI_BIN, ...args, "--base-url", API_BASE], {
      env: { ...process.env, FHIRFIX_API_KEY: apiKey },
      encoding: "utf8",
      timeout: 60_000,
    });
    return { code: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

function tryLink(re: RegExp, to?: string): string | null {
  try {
    return latestLink(re, to);
  } catch {
    return null;
  }
}
