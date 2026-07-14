import { describe, expect, test } from "bun:test";
import { createId, idPrefix } from "../id";

describe("createId", () => {
  test("prefixes ids by kind", () => {
    expect(createId("run")).toStartWith("run_");
    expect(createId("workspaceSettings")).toStartWith("wss_");
    expect(createId("apiKey")).toStartWith("key_");
  });

  test("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId("run")));
    expect(ids.size).toBe(1000);
  });

  test("uses the url-safe alphabet only", () => {
    const id = createId("finding");
    expect(id).toMatch(/^fnd_[0-9a-z]{20}$/);
  });

  test("every prefix is distinct", () => {
    const prefixes = Object.values(idPrefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});
