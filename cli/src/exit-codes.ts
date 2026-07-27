
export const EXIT = {
  // no findings at or above the severity threshold.
  ok: 0,
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
