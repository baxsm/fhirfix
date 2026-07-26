import { describe, expect, test } from "bun:test";
import { describeCron, isValidCron } from "@shared/db/cron";

describe("cron validation", () => {
  test("accepts the shapes the form offers", () => {
    expect(isValidCron("0 * * * *")).toBe(true);
    expect(isValidCron("*/15 * * * *")).toBe(true);
    expect(isValidCron("0 */6 * * *")).toBe(true);
    expect(isValidCron("30 2 * * *")).toBe(true);
    expect(isValidCron("0 9 * * 1")).toBe(true);
    expect(isValidCron("0 0 1 * *")).toBe(true);
  });

  test("accepts ranges, lists and named months and days", () => {
    expect(isValidCron("0 9-17 * * *")).toBe(true);
    expect(isValidCron("0 9,12,15 * * *")).toBe(true);
    expect(isValidCron("0 0 * jan-mar *")).toBe(true);
    expect(isValidCron("0 0 * * mon-fri")).toBe(true);
    expect(isValidCron("0 0-23/2 * * *")).toBe(true);
  });

  test("rejects junk", () => {
    expect(isValidCron("not a cron")).toBe(false);
    expect(isValidCron("")).toBe(false);
    expect(isValidCron("* * * *")).toBe(false); // 4 fields
    expect(isValidCron("* * * * * *")).toBe(false); // 6 fields
  });

  test("rejects out-of-range values per field", () => {
    expect(isValidCron("60 * * * *")).toBe(false); // minute maxes at 59
    expect(isValidCron("* 24 * * *")).toBe(false); // hour maxes at 23
    expect(isValidCron("* * 32 * *")).toBe(false); // day of month maxes at 31
    expect(isValidCron("* * * 13 *")).toBe(false); // month maxes at 12
    expect(isValidCron("* * * * 8")).toBe(false); // day of week maxes at 7
  });

  test("accepts both 0 and 7 for sunday", () => {
    expect(isValidCron("0 0 * * 0")).toBe(true);
    expect(isValidCron("0 0 * * 7")).toBe(true);
  });

  test("rejects malformed ranges and steps", () => {
    expect(isValidCron("0 17-9 * * *")).toBe(false); // inverted range
    expect(isValidCron("*/0 * * * *")).toBe(false); // zero step
    expect(isValidCron("*/a * * * *")).toBe(false); // non-numeric step
    expect(isValidCron("1-2-3 * * * *")).toBe(false); // three bounds
    expect(isValidCron("0 * * * ,")).toBe(false); // empty term
  });
});

describe("cron description", () => {
  test("describes the common shapes in plain language", () => {
    expect(describeCron("0 * * * *")).toBe("Every hour");
    expect(describeCron("* * * * *")).toBe("Every minute");
    expect(describeCron("0 */6 * * *")).toBe("Every 6 hours");
    expect(describeCron("*/15 * * * *")).toBe("Every 15 minutes");
    expect(describeCron("30 2 * * *")).toBe("Daily at 02:30");
    expect(describeCron("0 9 * * 1")).toBe("Weekly on Mon at 09:00");
    expect(describeCron("0 0 1 * *")).toBe("Monthly on day 1 at 00:00");
  });

  test("falls back to the raw expression rather than guessing", () => {
    expect(describeCron("0 9,12 * * *")).toBe("0 9,12 * * *");
    expect(describeCron("nonsense")).toBe("nonsense");
  });
});
