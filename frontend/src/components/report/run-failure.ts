// a failed run's `errorMessage` is whatever string the worker caught - a JSON
// parser message, a sidecar's connection error, a blob read failure. it is a
// log line, not a sentence for the person who uploaded the file.
//
// this maps the raw string to what actually happened and what to do about it.
// the raw string is never discarded; the screen still shows it verbatim under
// a disclosure, because that is what support needs.

export type FailureKind = "cancelled" | "input" | "service" | "unknown";

export interface Failure {
  kind: FailureKind;
  title: string;
  cause: string;
  // what the user can actually do. null when there is nothing useful to say.
  next: string | null;
  // a run that failed because the FILE is wrong will fail again unchanged, so
  // "run it again" is a lie. only true when a retry could plausibly succeed.
  retryable: boolean;
}

// "JSON Parse error: Unexpected identifier "this"" -> the quoted token.
const JSON_TOKEN = /Unexpected identifier "([^"]+)"/;

export function describeFailure(raw: string | null): Failure {
  const message = raw?.trim() ?? "";

  if (!message) {
    return {
      kind: "unknown",
      title: "Check failed",
      cause: "The run stopped before it finished, and no reason was recorded.",
      next: "Run the check again. If it keeps failing, contact support with the run id.",
      retryable: true,
    };
  }

  // a cancel is a deliberate action. it is stored as `failed` because the run
  // did not produce a report, but showing it as a failure blames the user for
  // something they chose to do.
  if (/^cancelled by user/i.test(message)) {
    return {
      kind: "cancelled",
      title: "Check cancelled",
      cause: "This check was stopped before it finished.",
      next: null,
      retryable: true,
    };
  }

  if (/JSON Parse error|Unexpected (identifier|token|end of)/i.test(message)) {
    const token = JSON_TOKEN.exec(message)?.[1];
    return {
      kind: "input",
      title: "This file is not valid JSON",
      cause: token
        ? `The file could not be parsed. The parser stopped at "${token}", which is not valid at that point.`
        : "The file could not be parsed as JSON, so there was nothing to check.",
      next: "Check the file opens in a JSON viewer, then upload it again.",
      retryable: false,
    };
  }

  if (/circuit is open/i.test(message)) {
    return {
      kind: "service",
      title: "Checks are paused",
      cause:
        "The conformance validator failed repeatedly, so new checks are being held back while it recovers.",
      next: "Wait a minute, then run the check again.",
      retryable: true,
    };
  }

  if (/unreachable|Unable to connect|ECONNREFUSED|fetch failed|timed? ?out/i.test(message)) {
    return {
      kind: "service",
      title: "The validator did not respond",
      cause:
        "The conformance validator could not be reached, so the file was never checked. Nothing was wrong with the file.",
      next: "This is usually temporary. Run the check again.",
      retryable: true,
    };
  }

  if (/could not read input blob|input blob unreadable/i.test(message)) {
    return {
      kind: "service",
      title: "The uploaded file could not be read",
      cause: "The file was accepted but could not be read back from storage when the check ran.",
      next: "Upload the file again.",
      retryable: false,
    };
  }

  return {
    kind: "unknown",
    title: "Check failed",
    cause: "The run stopped before it finished.",
    next: "Run the check again. If it keeps failing, contact support with the run id.",
    retryable: true,
  };
}
