import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const CAPTURE_FILE = process.env.EMAIL_CAPTURE_FILE ?? "";

// pull the MOST RECENT captured email whose subject matches (and, if given, the
// recipient), and extract the first http link. scans newest-first so parallel or
// sequential tests do not grab a stale token. relies on EMAIL_CAPTURE_FILE.
export function latestLink(subjectMatch: RegExp, to?: string): string {
  if (!CAPTURE_FILE) throw new Error("EMAIL_CAPTURE_FILE not set for e2e");
  const lines = readFileSync(CAPTURE_FILE, "utf8").trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const email = JSON.parse(lines[i] as string) as { subject: string; text: string; to: string };
    if (subjectMatch.test(email.subject) && (!to || email.to === to)) {
      const match = email.text.match(/https?:\/\/[^\s]+/);
      if (match) return match[0];
    }
  }
  throw new Error(`no captured email matching ${subjectMatch}${to ? ` for ${to}` : ""}`);
}

// hide the Next.js dev-mode indicator so it does not leak into screenshots.
export async function hideDevOverlay(page: Page) {
  await page.addStyleTag({
    content: "nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }",
  });
}
