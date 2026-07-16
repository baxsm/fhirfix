// the CLI's exit codes are its real contract: a build gate is scripted against
// them, so they must be stable and distinguishable. anything non-zero fails a CI
// step, but the specific code tells a pipeline WHY without parsing stdout.

export const EXIT = {
  // no findings at or above the severity threshold.
  ok: 0,
  // the gate tripped: conformance findings were found. this is the normal "your
  // build has FHIR problems" path, not an error.
  findings: 1,
  // the caller used the CLI wrong (bad flag, no file, unreadable input).
  usage: 2,
  // the key is missing, invalid, revoked, or lacks the scope.
  auth: 3,
  // the workspace is out of credits.
  credits: 4,
  // the API could not be reached, timed out, or returned 5xx.
  unavailable: 5,
  // the input is not a recognized FHIR/HL7v2 shape (422), or too large (413).
  input: 6,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];
