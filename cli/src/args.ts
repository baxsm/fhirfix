import { isThreshold, type Threshold } from "./gate.js";

// a hand-rolled parser. the CLI has one job and a handful of flags; a dependency
// for that is not worth the install weight in a CI image.

export type Command = "validate" | "fix" | "convert";

export interface ParsedArgs {
  command: Command;
  files: string[];
  apiKey?: string;
  baseUrl?: string;
  failOn: Threshold;
  json: boolean;
  quiet: boolean;
  redact: boolean;
  profiles: string[];
  // fix/convert only: where to write the corrected artifact.
  out?: string;
  // rewrite the input file in place with the corrected output.
  write: boolean;
  help: boolean;
  version: boolean;
  // github actions annotation output.
  githubAnnotations: boolean;
}

export class UsageError extends Error {}

const COMMANDS: Command[] = ["validate", "fix", "convert"];

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    command: "validate",
    files: [],
    failOn: "error",
    json: false,
    quiet: false,
    redact: false,
    profiles: [],
    write: false,
    help: false,
    version: false,
    githubAnnotations: false,
  };

  if (argv.length === 0) {
    args.help = true;
    return args;
  }

  // a bare --help/--version must work without a command.
  if (argv[0] === "--help" || argv[0] === "-h") return { ...args, help: true };
  if (argv[0] === "--version" || argv[0] === "-v") return { ...args, version: true };

  const command = argv[0];
  if (!command || !COMMANDS.includes(command as Command)) {
    throw new UsageError(`Unknown command "${command}". Expected one of: ${COMMANDS.join(", ")}.`);
  }
  args.command = command as Command;

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    // support both --flag=value and --flag value.
    const eq = arg.indexOf("=");
    const isLong = arg.startsWith("--");
    const name = isLong && eq !== -1 ? arg.slice(0, eq) : arg;
    const inlineValue = isLong && eq !== -1 ? arg.slice(eq + 1) : undefined;
    const takeValue = (): string => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[++i];
      if (next === undefined || next.startsWith("-")) {
        throw new UsageError(`${name} needs a value.`);
      }
      return next;
    };

    switch (name) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--version":
      case "-v":
        args.version = true;
        break;
      case "--api-key":
        args.apiKey = takeValue();
        break;
      case "--base-url":
        args.baseUrl = takeValue();
        break;
      case "--fail-on": {
        const value = takeValue();
        if (!isThreshold(value)) {
          throw new UsageError(`--fail-on must be error, warning, or info (got "${value}").`);
        }
        args.failOn = value;
        break;
      }
      case "--profile":
        args.profiles.push(takeValue());
        break;
      case "--out":
        args.out = takeValue();
        break;
      case "--write":
        args.write = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "--quiet":
      case "-q":
        args.quiet = true;
        break;
      case "--redact":
        args.redact = true;
        break;
      case "--github":
        args.githubAnnotations = true;
        break;
      default:
        if (name.startsWith("-")) throw new UsageError(`Unknown flag "${name}".`);
        args.files.push(arg);
    }
  }

  if (!args.help && !args.version && args.files.length === 0) {
    throw new UsageError(
      `${args.command} needs at least one file. Try: fhirfix ${args.command} ./bundle.json`,
    );
  }
  if (args.out && args.files.length > 1) {
    throw new UsageError("--out works with a single file. Use --write for multiple files.");
  }
  if (args.out && args.write) {
    throw new UsageError("Use either --out or --write, not both.");
  }
  if (args.write && args.command === "validate") {
    throw new UsageError("--write has nothing to write for validate. Use fix or convert.");
  }

  return args;
}

export const HELP = `fhirfix - validate, fix, and convert FHIR conformance issues

Usage
  fhirfix validate <files...>   Report conformance findings. Fails on findings.
  fhirfix fix <files...>        Apply safe fixes and return the corrected artifact.
  fhirfix convert <files...>    Convert HL7v2 or C-CDA to FHIR.

Options
  --api-key <key>      API key. Defaults to $FHIRFIX_API_KEY.
  --base-url <url>     API base url. Defaults to $FHIRFIX_BASE_URL or the public API.
  --fail-on <level>    Fail on error, warning, or info. Default: error.
  --profile <url>      Validate against a profile. Repeatable.
  --out <file>         Write the corrected output to a file (single input only).
  --write              Rewrite each input file in place with the corrected output.
  --redact             Redact PHI from the corrected output.
  --json               Emit machine-readable json instead of text.
  --github             Emit GitHub Actions annotations.
  --quiet, -q          Only print the summary line.
  --help, -h           Show this help.
  --version, -v        Show the version.

Exit codes
  0  no findings at or above --fail-on
  1  findings found (the gate tripped)
  2  usage error
  3  auth failed (missing, invalid, or unscoped key)
  4  out of credits
  5  API unreachable or failing
  6  input not valid FHIR/HL7v2, or too large

Examples
  fhirfix validate ./bundle.json
  fhirfix validate ./out/*.json --fail-on warning
  fhirfix fix ./patient.json --write
  fhirfix convert ./adt.hl7 --out ./patient.json
`;
