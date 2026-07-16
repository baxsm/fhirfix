import { expect, test } from "@playwright/test";

// the docs nav has broken three separate ways, and every one of them passed
// typecheck, lint and the unit suite. these assert the behaviors a reader
// actually depends on: the nav tells the truth about where you are, and the page
// does not pad itself with void to make that work.

const READ_WIDTH = 1568;
const ACTIVE_CLASS = "bg-foreground/[0.07]";

const SECTIONS = [
  "Introduction",
  "Authentication",
  "Quickstart",
  "Validate",
  "Fix",
  "Convert",
  "List runs",
  "Idempotency",
  "Webhooks",
  "Errors",
];

const activeItems = (page: import("@playwright/test").Page) =>
  page.$$eval(
    "aside nav a",
    (as, cls) =>
      as
        .filter((a) => a.className.includes(cls))
        .map((a) => (a.textContent ?? "").trim().replace(/^(POST|GET)\s*/, "")),
    ACTIVE_CLASS,
  );

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: READ_WIDTH, height: 1000 });
});

test("every nav link lands on its section and is the only active item", async ({ page }) => {
  await page.goto("/docs", { waitUntil: "networkidle" });

  for (const label of SECTIONS) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await page
      .locator("aside nav a")
      .filter({ hasText: new RegExp(`^(POST|GET)?\\s*${label}$`) })
      .first()
      .click();
    await page.waitForTimeout(1200);
    expect(await activeItems(page), `clicking "${label}"`).toEqual([label]);
  }
});

// the last section can never scroll to the marker - the page ends first. without
// a bottom clamp the tail links are permanently unreachable, which is what drove
// the 622px of empty padding this replaced.
test("the last section is active at the bottom of the page", async ({ page }) => {
  await page.goto("/docs", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  expect(await activeItems(page)).toEqual(["Errors"]);
});

// a deep link must show the right nav item on arrival, without the reader having
// to touch the wheel.
test("a deep link shows the right nav item on arrival", async ({ page }) => {
  for (const [hash, want] of [
    ["#errors", "Errors"],
    ["#webhooks", "Webhooks"],
    ["#idempotency", "Idempotency"],
    ["#convert", "Convert"],
  ] as const) {
    await page.goto(`/docs${hash}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    expect(await activeItems(page), `deep link ${hash}`).toEqual([want]);
  }
});

test("no dead gap on the right and no page-level horizontal scroll", async ({ page }) => {
  await page.goto("/docs", { waitUntil: "networkidle" });
  const layout = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) throw new Error("no main");
    const mainRight = main.getBoundingClientRect().right;
    let worstGap = 0;
    main.querySelectorAll("main > div > *, main > div").forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.height < 20) return;
      worstGap = Math.max(worstGap, Math.round(mainRight - b.right));
    });
    return {
      worstGap,
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  expect(layout.worstGap).toBeLessThanOrEqual(5);
  expect(layout.horizontalScroll).toBe(false);
});

// the tail was 622px of nothing to force the last link to work. real api docs
// land near 96-111px. this fails if anyone reaches for padding again.
test("the page does not end in a void", async ({ page }) => {
  await page.goto("/docs", { waitUntil: "networkidle" });
  const tail = await page.evaluate(() => {
    const sections = [...document.querySelectorAll("main section")];
    const last = sections[sections.length - 1];
    if (!last) throw new Error("no sections");
    const lastBottom = last.getBoundingClientRect().bottom + window.scrollY;
    return Math.round(document.documentElement.scrollHeight - lastBottom);
  });
  expect(tail).toBeLessThanOrEqual(160);
});

// short stub sections cannot hold the active state and read as unfinished next
// to 400-500px endpoint sections.
test("no reference section is a stub", async ({ page }) => {
  await page.goto("/docs", { waitUntil: "networkidle" });
  const short = await page.evaluate(() =>
    [...document.querySelectorAll("main section")]
      .map((s) => ({ id: s.id, height: Math.round(s.getBoundingClientRect().height) }))
      .filter((s) => ["idempotency", "webhooks", "errors"].includes(s.id) && s.height < 237),
  );
  expect(short).toEqual([]);
});
