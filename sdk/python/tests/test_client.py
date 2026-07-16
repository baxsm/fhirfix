"""Client behavior that does not need a live server."""

from __future__ import annotations

import pytest

from fhirfix import Fhirfix, FhirfixError, Finding
from fhirfix._types import RunPage, ValidateResult


@pytest.fixture(autouse=True)
def _no_ambient_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Unit tests must not read the developer's real environment.

    Without this, running the integration suite (which sets FHIRFIX_BASE_URL)
    changes what these tests assert.
    """
    monkeypatch.delenv("FHIRFIX_BASE_URL", raising=False)


def test_requires_a_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FHIRFIX_API_KEY", raising=False)
    with pytest.raises(FhirfixError, match="FHIRFIX_API_KEY"):
        Fhirfix()


def test_reads_the_key_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FHIRFIX_API_KEY", "ffx_test_fromenv")
    client = Fhirfix()
    assert client.base_url == "https://api.fhirfix.dev/api/v1"


def test_reads_the_base_url_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FHIRFIX_BASE_URL", "http://localhost:3001/api/v1")
    client = Fhirfix(api_key="k")
    assert client.base_url == "http://localhost:3001/api/v1"


def test_an_explicit_base_url_wins_over_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FHIRFIX_BASE_URL", "http://from-env/api/v1")
    client = Fhirfix(api_key="k", base_url="http://explicit/api/v1")
    assert client.base_url == "http://explicit/api/v1"


def test_strips_a_trailing_slash_so_urls_never_double_up() -> None:
    client = Fhirfix(api_key="k", base_url="http://localhost:3001/api/v1/")
    assert client.base_url == "http://localhost:3001/api/v1"


def test_finding_parses_the_wire_shape() -> None:
    finding = Finding.from_json(
        {
            "severity": "error",
            "category": "terminology",
            "resourceType": "Patient",
            "fhirpath": "Patient.gender",
            "ruleSource": "hapi",
            "specCitation": "spec",
            "plainMessage": "bad code",
            "suggestedFix": "use male",
            "fixConfidence": "auto",
            "fixStatus": "suggested",
            "occurrenceCount": 2,
        }
    )
    # the wire is camelCase; the python surface is snake_case.
    assert finding.resource_type == "Patient"
    assert finding.fhirpath == "Patient.gender"
    assert finding.plain_message == "bad code"
    assert finding.occurrence_count == 2


def test_finding_tolerates_missing_optional_fields() -> None:
    # resourceType/fhirpath are nullable on the wire.
    finding = Finding.from_json({"severity": "info", "category": "structural"})
    assert finding.resource_type is None
    assert finding.fhirpath is None
    assert finding.occurrence_count == 1


def test_validate_result_parses_findings() -> None:
    result = ValidateResult.from_json(
        {
            "runId": "run_1",
            "status": "completed",
            "inputType": "fhir_json",
            "conformanceScoreBefore": 730,
            "findingsTotal": 1,
            "findings": [{"severity": "error", "category": "terminology"}],
        }
    )
    assert result.run_id == "run_1"
    assert result.conformance_score_before == 730
    assert len(result.findings) == 1
    assert result.findings[0].severity == "error"


def test_run_page_parses_pagination() -> None:
    page = RunPage.from_json({"runs": [], "nextCursor": "2026-01-01T00:00:00Z", "hasMore": True})
    assert page.has_more is True
    assert page.next_cursor == "2026-01-01T00:00:00Z"


def test_run_page_handles_an_empty_last_page() -> None:
    page = RunPage.from_json({"runs": [], "nextCursor": None, "hasMore": False})
    assert page.next_cursor is None
    assert page.has_more is False
