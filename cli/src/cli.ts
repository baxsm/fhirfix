import { appendFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ApiError,
  AuthenticationError,
  BadRequestError,
  ConnectionError,
  type ConvertResult,
  Fhirfix,
  type Finding,
  type FixResult,
  OutOfCreditsError,
  PermissionDeniedError,
  RateLimitError,
  ServerError,
  UnprocessableError,
  type ValidateResult,
} from "fhirfix";
import { HELP, type ParsedArgs, parseArgs, UsageError } from "./args.js";
import { EXIT, type ExitCode } from "./exit-codes.js";
import { type GateSummary, summarize } from "./gate.js";
import {
  type JsonReport,
  renderGithubAnnotation,
  renderJobSummary,
  renderSummaryLine,
  renderText,
} from "./report.js";

const VERSION = "0.1.0";

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
  env: Record<string, string | undefined>;
}

const defaultIo: Io = {
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
  env: process.env,
};

// map an SDK error to the CLI's exit contract. a build gate scripts against these,
// so the mapping is the product surface, not an implementation detail.
export function exitCodeFor(err: unknown): ExitCode {
  if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) return EXIT.auth;
  if (err instanceof OutOfCreditsError) return EXIT.credits;
  if (err instanceof UnprocessableError || err instanceof BadRequestError) return EXIT.input;
  // a 429 that survived the SDK's retries means the API is effectively unavailable
  // to this caller right now. blaming the input would send someone to edit a file
  // that is fine; unavailable tells them to retry the job.
  if (err instanceof RateLimitError) return EXIT.unavailable;
  if (err instanceof ConnectionError || err instanceof ServerError) return EXIT.unavailable;
  // any other ApiError (404, 409, unexpected 4xx) is the caller's request problem.
  if (err instanceof ApiError) return EXIT.input;
  return EXIT.unavailable;
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) return `${err.message} (${err.code})`;
  if (err instanceof Error) return err.message;
  return String(err);
}

// the three commands return different shapes. one union keeps the field access
// honest instead of casting to a bag of optionals.
type CommandResult = ValidateResult | FixResult | ConvertResult;

// the corrected/converted artifact, or null for validate (which changes nothing).
function artifactOf(result: CommandResult): string | null {
  if ("corrected" in result) return result.corrected;
  if ("fhir" in result) return result.fhir;
  return null;
}

// only fix reports an "after" score; validate and convert do not re-verify.
function scoreAfterOf(result: CommandResult): number | undefined {
  return "conformanceScoreAfter" in result ? result.conformanceScoreAfter : undefined;
}

function scoreBeforeOf(result: CommandResult): number {
  return "conformanceScoreBefore" in result ? result.conformanceScoreBefore : 0;
}

export async function run(argv: string[], io: Io = defaultIo): Promise<ExitCode> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
    if (err instanceof UsageError) {
      io.err(err.message);
      return EXIT.usage;
    }
    throw err;
  }

  if (args.help) {
    io.out(HELP);
    return EXIT.ok;
  }
  if (args.version) {
    io.out(VERSION);
    return EXIT.ok;
  }

  const apiKey = args.apiKey ?? io.env.FHIRFIX_API_KEY;
  if (!apiKey) {
    io.err("No API key. Pass --api-key or set FHIRFIX_API_KEY.");
    return EXIT.auth;
  }

  // there is no public host to fall back on, so a missing base url is a usage
  // error the caller can fix, not an auth failure or a DNS error mid-run.
  const baseUrl = args.baseUrl ?? io.env.FHIRFIX_BASE_URL;
  if (!baseUrl) {
    io.err(
      "No API base url. Pass --base-url or set FHIRFIX_BASE_URL, e.g. http://localhost:3001/api/v1",
    );
    return EXIT.usage;
  }

  let client: Fhirfix;
  try {
    client = new Fhirfix({ apiKey, baseUrl });
  } catch (err) {
    io.err(messageFor(err));
    return EXIT.auth;
  }

  const rows: Array<{ file: string; summary: GateSummary }> = [];
  const jsonReports: JsonReport[] = [];
  // every finding across every file, for the one-line totals at the end.
  const allFindings: Finding[] = [];
  let worstExit: ExitCode = EXIT.ok;

  for (const file of args.files) {
    const path = resolve(file);
    let input: string;
    try {
      input = await readFile(path, "utf8");
    } catch {
      io.err(`Could not read ${file}.`);
      return EXIT.usage;
    }
    if (input.trim() === "") {
      io.err(`${file} is empty.`);
      return EXIT.usage;
    }

    try {
      const request = {
        input,
        profiles: args.profiles.length ? args.profiles : undefined,
        redact: args.redact,
      };
      const result =
        args.command === "validate"
          ? await client.validate(request)
          : args.command === "fix"
            ? await client.fix(request)
            : await client.convert(request);

      const findings: Finding[] = result.findings;
      const summary = summarize(findings, args.failOn);
      rows.push({ file, summary });
      allFindings.push(...findings);

      // write the artifact before the gate decides, so `fix --write` still
      // produces output when findings remain (partial fixes are the normal case).
      const artifact = artifactOf(result);
      if (artifact) {
        if (args.out) await writeFile(resolve(args.out), artifact, "utf8");
        else if (args.write) await writeFile(path, artifact, "utf8");
      }

      if (args.json) {
        jsonReports.push({
          file,
          runId: result.runId,
          passed: summary.passed,
          conformanceScoreBefore: scoreBeforeOf(result),
          conformanceScoreAfter: scoreAfterOf(result),
          findingsTotal: findings.length,
          errors: summary.errors,
          warnings: summary.warnings,
          infos: summary.infos,
          findings,
        });
      } else if (!args.quiet) {
        io.out(renderText(file, summary, findings));
      }

      if (args.githubAnnotations) {
        for (const finding of summary.blocking) {
          // annotations go to stdout: the runner parses the log stream. the path
          // must be repo-relative or the annotation will not attach to the PR.
          io.out(renderGithubAnnotation(file, finding, io.env.GITHUB_WORKSPACE));
        }
      }

      if (!summary.passed) worstExit = EXIT.findings;
    } catch (err) {
      io.err(`${file}: ${messageFor(err)}`);
      return exitCodeFor(err);
    }
  }

  const combined = summarize(allFindings, args.failOn);

  if (args.json) {
    io.out(JSON.stringify({ passed: worstExit === EXIT.ok, files: jsonReports }, null, 2));
  } else {
    io.out(renderSummaryLine(args.files.length, combined, args.failOn));
  }

  // a job summary is only meaningful inside a github runner.
  if (args.githubAnnotations && io.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      io.env.GITHUB_STEP_SUMMARY,
      renderJobSummary(rows, io.env.GITHUB_WORKSPACE),
      "utf8",
    );
  }
  if (args.githubAnnotations && io.env.GITHUB_OUTPUT) {
    const errors = rows.reduce((n, r) => n + r.summary.errors, 0);
    const warnings = rows.reduce((n, r) => n + r.summary.warnings, 0);
    // set-output was deprecated and removed; $GITHUB_OUTPUT is the current path.
    await appendFile(
      io.env.GITHUB_OUTPUT,
      `error-count=${errors}\nwarning-count=${warnings}\npassed=${worstExit === EXIT.ok}\n`,
      "utf8",
    );
  }

  return worstExit;
}

// the binary entry. set exitCode and let node exit on its own once the event loop
// drains. process.exit() would tear the process down while the stdout writes and
// the $GITHUB_OUTPUT/$GITHUB_STEP_SUMMARY appends are still in flight - on windows
// that aborts with a libuv assertion and exit 127, which in CI reads as a crash
// rather than the gate result it actually is.
export async function main(): Promise<void> {
  process.exitCode = await run(process.argv.slice(2));
}
