"""Error classes for the FHIRfix client.

The shape follows the convention used by the Anthropic and Stripe clients: one
base class, a per-status subclass so ``except RateLimitError`` works without
inspecting status codes, and a factory that maps a response to the right class.
"""

from __future__ import annotations

from typing import Any


class FhirfixError(Exception):
    """Base class for everything this library raises."""


class APIError(FhirfixError):
    """A non-2xx response from the API.

    ``code`` is the machine code from the error envelope ({"error", "message"}),
    which is the stable thing to branch on. ``status`` is the HTTP status.
    """

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        headers: dict[str, str],
        body: Any = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.headers = headers
        self.body = body


class BadRequestError(APIError):
    """400 bad_request, or 413 too_large."""


class AuthenticationError(APIError):
    """401. No valid API key."""


class OutOfCreditsError(APIError):
    """402. The workspace is out of credits."""


class PermissionDeniedError(APIError):
    """403. The key is missing the scope for this action."""


class NotFoundError(APIError):
    """404."""


class ConflictError(APIError):
    """409. An Idempotency-Key was reused with a different body."""


class UnprocessableError(APIError):
    """422. The input is not a recognized FHIR or HL7v2 shape."""


class RateLimitError(APIError):
    """429. ``retry_after`` is seconds, taken from the Retry-After header."""

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        headers: dict[str, str],
        body: Any = None,
        retry_after: int | None = None,
    ) -> None:
        super().__init__(status, code, message, headers, body)
        header = headers.get("retry-after")
        if retry_after is None and header is not None:
            try:
                retry_after = int(header)
            except ValueError:
                retry_after = None
        self.retry_after = retry_after


class ServerError(APIError):
    """5xx, including 503 sidecar_unavailable when a sidecar is down."""


class ConnectionError(FhirfixError):
    """The request never got a response: DNS, refused connection, or a timeout."""

    def __init__(self, message: str, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause


class TimeoutError(ConnectionError):
    """The request exceeded the client timeout."""


# status -> class. anything unlisted falls back by range in from_response().
_BY_STATUS: dict[int, type[APIError]] = {
    400: BadRequestError,
    401: AuthenticationError,
    402: OutOfCreditsError,
    403: PermissionDeniedError,
    404: NotFoundError,
    409: ConflictError,
    413: BadRequestError,
    422: UnprocessableError,
    429: RateLimitError,
}


def error_from_response(status: int, headers: dict[str, str], body: Any, raw: str) -> APIError:
    """Build the right error subclass for a response."""
    envelope = body if isinstance(body, dict) else {}
    code = envelope.get("error", "unknown")
    message = envelope.get("message") or raw[:200] or f"Request failed with status {status}"

    cls = _BY_STATUS.get(status)
    if cls is None:
        cls = ServerError if status >= 500 else APIError

    if cls is RateLimitError:
        return RateLimitError(status, code, message, headers, body, envelope.get("retryAfter"))
    return cls(status, code, message, headers, body)
