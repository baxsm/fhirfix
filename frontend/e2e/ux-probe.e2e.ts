import { test } from "@playwright/test";
import { writeFileSync } from "node:fs";

// Walks a real user goal against the live app and records what a reader would
// actually perceive at each step. It does NOT judge and it does NOT assert a
// design. It only records observables along the journey.
//
// A separate reviewer reads the trace and answers the two cognitive-walkthrough
// questions per step:
//   1. will the user know what to do here?
//   2. if they do the right thing, will they know it worked?
//
// Goals are the only thing to update as features land. The observables are
// properties of "a person using a page", not of any component, so a redesign
// does not rot them.

const GOAL_PATH = "/docs";
const READ_WIDTH = 1568;

type Step = {
  step: string;
  scrollY: number;
  observations: Record<string, unknown>;
};

test("ux probe: read the api docs and find the error reference", async ({ page }) => {
  const steps: Step[] = [];
  await page.setViewportSize({ width: READ_WIDTH, height: 900 });
  await page.goto(GOAL_PATH, { waitUntil: "networkidle" });

  const record = async (step: string) => {
    const observations = await page.evaluate(() => {
      const vh = window.innerHeight;
      const inViewport = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < vh && r.height > 0;
      };

      // the left rail a reader uses to jump between sections. "visible" is not
      // enough - a rail that renders but sits above the fold is gone as far as
      // the reader is concerned. we record its position relative to the reader.
      const allNavLinks = Array.from(document.querySelectorAll("nav a"));
      const sideNav = allNavLinks.filter((a) => a.getBoundingClientRect().left < 320);
      const navVisible = sideNav.filter(inViewport).length;
      const firstNav = sideNav[0]?.getBoundingClientRect();
      // where the rail sits in the viewport right now. if this marches negative
      // as the reader scrolls, the rail is leaving with the content.
      const navTopInViewport = firstNav ? Math.round(firstNav.top) : null;

      // which item reads as "you are here". we don't hardcode a class - we ask
      // which link is visually distinguished from its siblings.
      const activeLooking = sideNav
        .filter((a) => {
          const s = getComputedStyle(a);
          const hasBg = s.backgroundColor !== "rgba(0, 0, 0, 0)";
          const isBold = Number.parseInt(s.fontWeight, 10) >= 500;
          return hasBg || isBold;
        })
        .map((a) => a.textContent?.trim() ?? "");

      // dead horizontal space. measure LEAF elements (real text/code the eye
      // lands on), not layout containers - a <section> spans full width even
      // when everything inside it is a narrow left column.
      const main = document.querySelector("main");
      let contentRight = 0;
      let mainRight = 0;
      if (main) {
        mainRight = main.getBoundingClientRect().right;
        const leaves = Array.from(main.querySelectorAll("*")).filter((el) => {
          if (el.children.length > 0) return false; // containers don't count
          const text = el.textContent?.trim() ?? "";
          if (text.length === 0) return false;
          const r = el.getBoundingClientRect();
          return r.height > 4 && r.width > 4 && inViewport(el);
        });
        for (const leaf of leaves) {
          contentRight = Math.max(contentRight, leaf.getBoundingClientRect().right);
        }
      }

      // what the reader is actually looking at
      const heads = Array.from(document.querySelectorAll("h1, h2"));
      const atRead = heads.filter((h) => h.getBoundingClientRect().top <= 160).pop();

      return {
        navLinksVisibleFromHere: navVisible,
        navLinksTotal: sideNav.length,
        navTopInViewport,
        navItemsLookingActive: activeLooking,
        headingAtReadPosition: atRead?.textContent?.trim() ?? null,
        deadRightGapPx: main && contentRight > 0 ? Math.round(mainRight - contentRight) : null,
      };
    });
    steps.push({ step, scrollY: await page.evaluate(() => window.scrollY), observations });
  };

  await record("landed on page");

  // a reader skims the whole document
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 900; y < height; y += 1200) {
    await page.evaluate((to) => window.scrollTo({ top: to, behavior: "instant" }), y);
    await page.waitForTimeout(250);
    await record(`scrolled to ${y}`);
  }

  // finished a section, now wants the next one - the moment the nav matters
  await page.evaluate(() => window.scrollTo({ top: 2400, behavior: "instant" }));
  await page.waitForTimeout(300);
  await record("deep in page, wants to jump to another section");

  const errors = page.locator("nav a", { hasText: "Errors" }).first();
  const reachable = await errors.isVisible().catch(() => false);
  steps.push({
    step: "tried to use nav from deep in page",
    scrollY: 2400,
    observations: { navReachableWithoutScrollingBackToTop: reachable },
  });

  if (reachable) {
    const before = await page.evaluate(() => window.scrollY);
    await errors.click();
    await page.waitForTimeout(150);
    const mid = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => window.scrollY);
    steps.push({
      step: "clicked 'Errors' in nav",
      scrollY: after,
      observations: {
        // an instant jump means from==mid==to. a smooth scroll passes through.
        scrollWasAnimated: mid !== before && mid !== after,
        scrollFrom: before,
        scrollTo: after,
      },
    });
    await record("after clicking 'Errors'");
  }

  writeFileSync(
    "e2e/ux-trace.json",
    JSON.stringify({ goal: GOAL_PATH, width: READ_WIDTH, steps }, null, 2),
  );
  console.log(JSON.stringify(steps, null, 2));
});
