"""The error mapping is the contract callers branch on."""

from __future__ import annotations

import pytest

from fhirfix import (
    APIError,
    AuthenticationError,
    BadRequestError,
    ConflictError,
    FhirfixError,
    NotFoundError,
    OutOfCreditsError,
    PermissionDeniedError,
    RateLimitError,
    ServerError,
    UnprocessableError,
)
from fhirfix._errors import error_from_response


@pytest.mark.parametrize(
    ("status", "code", "expected"),
    [
        (400, "bad_request", BadRequestError),
        (413, "too_large", BadRequestError),
        (401, "unauthorized", AuthenticationError),
        (402, "out_of_credits", OutOfCreditsError),
        (403, "forbidden", PermissionDeniedError),
        (404, "not_found", NotFoundError),
        (409, "idempotency_conflict", ConflictError),
        (422, "unprocessable", UnprocessableError),
        (429, "rate_limited", RateLimitError),
        (500, "internal", ServerError),
        (503, "sidecar_unavailable", ServerError),
    ],
)
def test_maps_status_to_its_own_class(status: int, code: str, expected: type) -> None:
    err = error_from_response(status, {}, {"error": code, "message": "nope"}, "")
    assert isinstance(err, expected)
    assert err.status == status
    assert err.code == code
    assert err.message == "nope"


def test_every_error_is_catchable_as_the_base() -> None:
    err = error_from_response(401, {}, {"error": "unauthorized", "message": "no"}, "")
    assert isinstance(err, FhirfixError)
    assert isinstance(err, APIError)


def test_rate_limit_reads_retry_after_from_the_header() -> None:
    err = error_from_response(429, {"retry-after": "7"}, {"error": "rate_limited"}, "")
    assert isinstance(err, RateLimitError)
    assert err.retry_after == 7


def test_rate_limit_prefers_the_json_field_when_present() -> None:
    err = error_from_response(
        429, {"retry-after": "7"}, {"error": "rate_limited", "retryAfter": 3}, ""
    )
    assert isinstance(err, RateLimitError)
    assert err.retry_after == 3


def test_rate_limit_survives_a_junk_retry_after() -> None:
    # a proxy can send a http-date instead of seconds; it must not crash the client.
    err = error_from_response(429, {"retry-after": "Wed, 21 Oct 2026 07:28:00 GMT"}, {}, "")
    assert isinstance(err, RateLimitError)
    assert err.retry_after is None


def test_a_non_json_body_still_produces_an_api_error() -> None:
    err = error_from_response(502, {}, None, "<html>502 Bad Gateway</html>")
    assert isinstance(err, ServerError)
    assert err.code == "unknown"
    # the raw text is surfaced, not swallowed: that is what a caller debugs with.
    assert "502" in err.message


def test_an_unknown_4xx_falls_back_to_the_base_api_error() -> None:
    err = error_from_response(418, {}, {"error": "teapot", "message": "short"}, "")
    assert isinstance(err, APIError)
    assert err.status == 418
