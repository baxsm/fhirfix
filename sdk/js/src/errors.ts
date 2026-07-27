
// every error the SDK throws inherits this, so one catch can cover the SDK.
export class FhirfixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ApiError extends FhirfixError {
  readonly status: number;
  readonly code: string;
  readonly headers: Headers;
  readonly body: unknown;

  constructor(status: number, code: string, message: string, headers: Headers, body: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
    this.body = body;
  }

  static from(status: number, headers: Headers, body: unknown, raw: string): ApiError {
    const envelope = (body ?? {}) as { error?: string; message?: string; retryAfter?: number };
    const code = envelope.error ?? "unknown";
    const message = envelope.message ?? raw.slice(0, 200) ?? `Request failed with status ${status}`;

    switch (status) {
      case 400:
      case 413:
        return new BadRequestError(status, code, message, headers, body);
      case 401:
        return new AuthenticationError(status, code, message, headers, body);
      case 403:
        return new PermissionDeniedError(status, code, message, headers, body);
      case 404:
        return new NotFoundError(status, code, message, headers, body);
      case 409:
        return new ConflictError(status, code, message, headers, body);
      case 402:
        return new OutOfCreditsError(status, code, message, headers, body);
      case 422:
        return new UnprocessableError(status, code, message, headers, body);
      case 429:
        return new RateLimitError(status, code, message, headers, body, envelope.retryAfter);
      default:
        if (status >= 500) return new ServerError(status, code, message, headers, body);
        return new ApiError(status, code, message, headers, body);
    }
  }
}

// 400 bad_request / 413 too_large - the request body was malformed or too big.
export class BadRequestError extends ApiError {}

// 401 unauthorized - no valid API key.
export class AuthenticationError extends ApiError {}

// 403 forbidden - the key is missing the scope for this action.
export class PermissionDeniedError extends ApiError {}

// 404 not_found / no_artifact.
export class NotFoundError extends ApiError {}

// 409 idempotency_conflict - an Idempotency-Key was reused with a different body.
export class ConflictError extends ApiError {}

// 402 out_of_credits - add credits or enable auto-recharge.
export class OutOfCreditsError extends ApiError {}

// 422 unprocessable - the input is not a recognized FHIR/HL7v2 shape.
export class UnprocessableError extends ApiError {}

// 429 rate_limited. retryAfter is seconds, echoed from the Retry-After header.
export class RateLimitError extends ApiError {
  readonly retryAfter: number | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    headers: Headers,
    body: unknown,
    retryAfter?: number,
  ) {
    super(status, code, message, headers, body);
    // prefer the header; the json field is a convenience mirror of it.
    const header = headers.get("retry-after");
    this.retryAfter = retryAfter ?? (header ? Number(header) : undefined);
  }
}

// 5xx, including 503 sidecar_unavailable when the validator/converter is down.
export class ServerError extends ApiError {}

// the request never got a response: DNS, refused connection, or a timeout.
export class ConnectionError extends FhirfixError {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.cause = cause;
  }
}

// the request exceeded the client timeout.
export class TimeoutError extends ConnectionError {}
