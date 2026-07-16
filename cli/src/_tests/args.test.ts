import { describe, expect, test } from "bun:test";
import { parseArgs, UsageError } from "../args.js";

describe("parseArgs", () => {
  test("parses a command and its files", () => {
    const args = parseArgs(["validate", "a.json", "b.json"]);
    expect(args.command).toBe("validate");
    expect(args.files).toEqual(["a.json", "b.json"]);
    // the default gate is errors only: warnings should not break a build unasked.
    expect(args.failOn).toBe("error");
  });

  test("no args shows help rather than erroring", () => {
    expect(parseArgs([]).help).toBe(true);
  });

  test("--help and --version work without a command", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
    expect(parseArgs(["--version"]).version).toBe(true);
    expect(parseArgs(["-v"]).version).toBe(true);
  });

  test("rejects an unknown command", () => {
    expect(() => parseArgs(["frobnicate", "a.json"])).toThrow(UsageError);
  });

  test("rejects an unknown flag", () => {
    expect(() => parseArgs(["validate", "a.json", "--turbo"])).toThrow(UsageError);
  });

  test("requires at least one file", () => {
    expect(() => parseArgs(["validate"])).toThrow(/needs at least one file/);
  });

  test("accepts --flag value and --flag=value alike", () => {
    expect(parseArgs(["validate", "a.json", "--fail-on", "warning"]).failOn).toBe("warning");
    expect(parseArgs(["validate", "a.json", "--fail-on=warning"]).failOn).toBe("warning");
  });

  test("rejects an invalid --fail-on", () => {
    expect(() => parseArgs(["validate", "a.json", "--fail-on", "critical"])).toThrow(
      /must be error, warning, or info/,
    );
  });

  test("a flag missing its value is a usage error, not a silent default", () => {
    expect(() => parseArgs(["validate", "a.json", "--api-key"])).toThrow(/needs a value/);
  });

  test("collects repeated --profile flags", () => {
    const args = parseArgs([
      "validate",
      "a.json",
      "--profile",
      "http://a",
      "--profile",
      "http://b",
    ]);
    expect(args.profiles).toEqual(["http://a", "http://b"]);
  });

  test("parses the boolean flags", () => {
    const args = parseArgs(["fix", "a.json", "--json", "--quiet", "--redact", "--github"]);
    expect(args.json).toBe(true);
    expect(args.quiet).toBe(true);
    expect(args.redact).toBe(true);
    expect(args.githubAnnotations).toBe(true);
  });

  test("--out with multiple files is rejected", () => {
    // writing two corrected artifacts to one path would silently lose one.
    expect(() => parseArgs(["fix", "a.json", "b.json", "--out", "o.json"])).toThrow(/single file/);
  });

  test("--out and --write together is rejected", () => {
    expect(() => parseArgs(["fix", "a.json", "--out", "o.json", "--write"])).toThrow(
      /either --out or --write/,
    );
  });

  test("--write on validate is rejected: there is nothing to write", () => {
    expect(() => parseArgs(["validate", "a.json", "--write"])).toThrow(/nothing to write/);
  });

  test("--write is allowed for fix and convert", () => {
    expect(parseArgs(["fix", "a.json", "--write"]).write).toBe(true);
    expect(parseArgs(["convert", "a.hl7", "--write"]).write).toBe(true);
  });
});
