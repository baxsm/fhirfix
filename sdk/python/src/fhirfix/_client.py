"""The FHIRfix REST API client."""

from __future__ import annotations

import builtins
import json
import os
import random
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from ._errors import (
    ConnectionError,
    FhirfixError,
    RateLimitError,
    ServerError,
    TimeoutError,
    error_from_response,
)
from ._types import (
    BatchResult,
    ConvertResult,
    FixResult,
    PingResult,
    ReportFormat,
    RunDetail,
    RunPage,
    RunStatus,
    ValidateResult,
)

__version__ = "0.1.0"

# no default base url on purpose: there is no public host yet, and defaulting to
# one that does not exist would fail at request time with a DNS error instead of
# at construction with something a caller can act on.
# the engine runs synchronously against the validator/converter sidecars, so a fix
# on a large bundle is slow by nature. this is well above the observed p99.
DEFAULT_TIMEOUT = 120.0
DEFAULT_MAX_RETRIES = 2


def _backoff(attempt: int) -> float:
    """Full-jitter backoff.

    The jitter matters: without it every client rate-limited in the same window
    retries in the same instant and re-triggers the limit.
    """
    return random.random() * float(min(2**attempt, 8))


class Fhirfix:
    """Client for the FHIRfix REST API.

    >>> fhirfix = Fhirfix(api_key="ffx_test_...")
    >>> result = fhirfix.fix(input=patient_json)
    >>> result.conformance_score_after
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        key = api_key or os.environ.get("FHIRFIX_API_KEY")
        if not key:
            raise FhirfixError(
                "No API key. Pass api_key= or set the FHIRFIX_API_KEY environment variable."
            )
        self._api_key = key

        url = base_url or os.environ.get("FHIRFIX_BASE_URL")
        if not url:
            raise FhirfixError(
                "No base URL. Pass base_url= or set the FHIRFIX_BASE_URL environment "
                'variable, e.g. "http://localhost:3001/api/v1".'
            )
        # tolerate a trailing slash so base_url + path never doubles up.
        self.base_url = url.rstrip("/")
        self._timeout = timeout
        self._max_retries = max_retries

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
        raw: bool = False,
    ) -> Any:
        url = self.base_url + path
        if query:
            # drop unset filters rather than sending "None" strings.
            params = {k: v for k, v in query.items() if v is not None}
            if params:
                url = f"{url}?{urllib.parse.urlencode(params)}"

        data = json.dumps(body).encode() if body is not None else None
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
            "User-Agent": f"fhirfix-python/{__version__}",
        }
        if data is not None:
            headers["Content-Type"] = "application/json"
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        last_error: BaseException | None = None
        for attempt in range(self._max_retries + 1):
            request = urllib.request.Request(url, data=data, headers=headers, method=method)
            try:
                with urllib.request.urlopen(request, timeout=self._timeout) as response:
                    payload = response.read()
                    if raw:
                        return payload
                    return json.loads(payload) if payload else None
            except urllib.error.HTTPError as exc:
                # a non-2xx arrives here. the body and headers are still readable
                # off the exception, which is what the error envelope needs.
                text = exc.read().decode("utf-8", "replace")
                try:
                    parsed = json.loads(text)
                except ValueError:
                    parsed = None
                resp_headers = {k.lower(): v for k, v in exc.headers.items()}
                error = error_from_response(exc.code, resp_headers, parsed, text)

                # only 429 and 5xx are worth retrying. a 401/403/409/422 fails
                # identically every time, so retrying wastes the caller's quota.
                retryable = isinstance(error, (RateLimitError, ServerError))
                if not retryable or attempt == self._max_retries:
                    raise error from None

                wait = (
                    float(error.retry_after)
                    if isinstance(error, RateLimitError) and error.retry_after is not None
                    else _backoff(attempt)
                )
                last_error = error
                time.sleep(wait)
            except urllib.error.URLError as exc:
                # no response at all: refused, DNS, or a socket timeout. note
                # `builtins.TimeoutError` here, NOT our TimeoutError - this module
                # shadows the builtin name, and socket timeouts raise the builtin.
                reason = exc.reason
                is_timeout = isinstance(reason, builtins.TimeoutError) or "timed out" in str(reason)
                wrapped: ConnectionError = (
                    TimeoutError(f"Request timed out after {self._timeout}s.", exc)
                    if is_timeout
                    else ConnectionError(
                        f"Could not reach the FHIRfix API at {self.base_url}: {reason}", exc
                    )
                )
                if attempt == self._max_retries:
                    raise wrapped from None
                last_error = wrapped
                time.sleep(_backoff(attempt))
            except builtins.TimeoutError as exc:
                # a bare socket timeout, not wrapped in URLError on some platforms.
                wrapped_timeout = TimeoutError(f"Request timed out after {self._timeout}s.", exc)
                if attempt == self._max_retries:
                    raise wrapped_timeout from None
                last_error = wrapped_timeout
                time.sleep(_backoff(attempt))

        # unreachable: the loop either returns or raises on the final attempt.
        raise last_error if last_error else FhirfixError("Request failed.")

    def ping(self) -> PingResult:
        """Confirm a key works and see its mode and scopes. Costs no credits."""
        return PingResult.from_json(self._request("GET", "/ping"))

    def validate(
        self,
        input: str,
        *,
        profiles: list[str] | None = None,
        redact: bool = False,
        idempotency_key: str | None = None,
    ) -> ValidateResult:
        """Validate a resource, bundle, or HL7v2 message. No fixes applied."""
        return ValidateResult.from_json(
            self._request(
                "POST",
                "/validate",
                body={"input": input, "profiles": profiles, "redact": redact},
                idempotency_key=idempotency_key,
            )
        )

    def fix(
        self,
        input: str,
        *,
        profiles: list[str] | None = None,
        redact: bool = False,
        idempotency_key: str | None = None,
    ) -> FixResult:
        """Validate, apply safe fixes, re-verify, and return the corrected artifact."""
        return FixResult.from_json(
            self._request(
                "POST",
                "/fix",
                body={"input": input, "profiles": profiles, "redact": redact},
                idempotency_key=idempotency_key,
            )
        )

    def convert(
        self,
        input: str,
        *,
        profiles: list[str] | None = None,
        redact: bool = False,
        idempotency_key: str | None = None,
    ) -> ConvertResult:
        """Convert HL7v2 or C-CDA to FHIR, applying the workspace mapping registry."""
        return ConvertResult.from_json(
            self._request(
                "POST",
                "/convert",
                body={"input": input, "profiles": profiles, "redact": redact},
                idempotency_key=idempotency_key,
            )
        )

    def batch(
        self,
        input: str,
        *,
        profiles: list[str] | None = None,
        auto_fix: bool = True,
        idempotency_key: str | None = None,
    ) -> BatchResult:
        """Submit a large input as one async run.

        Returns immediately. Completion arrives by run.completed webhook, or poll
        runs_get(run_id).
        """
        return BatchResult.from_json(
            self._request(
                "POST",
                "/batch",
                body={"input": input, "profiles": profiles, "autoFix": auto_fix},
                idempotency_key=idempotency_key,
            )
        )

    def runs_list(
        self,
        *,
        status: RunStatus | None = None,
        input_type: str | None = None,
        cursor: str | None = None,
        limit: int | None = None,
    ) -> RunPage:
        """List runs, newest first. Pass next_cursor from the previous page."""
        return RunPage.from_json(
            self._request(
                "GET",
                "/runs",
                query={
                    "status": status,
                    "inputType": input_type,
                    "cursor": cursor,
                    "limit": limit,
                },
            )
        )

    def runs_get(self, run_id: str) -> RunDetail:
        """One run plus its findings."""
        return RunDetail.from_json(
            self._request("GET", f"/runs/{urllib.parse.quote(run_id, safe='')}")
        )

    def runs_corrected(self, run_id: str) -> str:
        """The corrected artifact, in its original format."""
        payload: bytes = self._request(
            "GET", f"/runs/{urllib.parse.quote(run_id, safe='')}/corrected", raw=True
        )
        return payload.decode("utf-8")

    def runs_report(self, run_id: str, format: ReportFormat = "json") -> str:
        """The report as json or a FHIR OperationOutcome."""
        payload: bytes = self._request(
            "GET",
            f"/runs/{urllib.parse.quote(run_id, safe='')}/report",
            query={"format": format},
            raw=True,
        )
        return payload.decode("utf-8")

    def runs_report_bytes(self, run_id: str, format: ReportFormat = "pdf") -> bytes:
        """The report as bytes. Use this for the pdf format."""
        payload: bytes = self._request(
            "GET",
            f"/runs/{urllib.parse.quote(run_id, safe='')}/report",
            query={"format": format},
            raw=True,
        )
        return payload
