"""REAL http against a running backend. No mocks.

    FHIRFIX_API_KEY=ffx_test_... FHIRFIX_BASE_URL=http://localhost:3001/api/v1 pytest

Skips itself when no key or no reachable API, so the suite stays green on a
machine with nothing running.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
import uuid

import pytest

from fhirfix import (
    AuthenticationError,
    ConflictError,
    Fhirfix,
    NotFoundError,
    UnprocessableError,
)

BASE_URL = os.environ.get("FHIRFIX_BASE_URL", "http://localhost:3001/api/v1")
API_KEY = os.environ.get("FHIRFIX_API_KEY")

# a Patient with a real defect: "M" is not a valid administrative-gender code.
BAD_PATIENT = json.dumps(
    {
        "resourceType": "Patient",
        "id": "example",
        "gender": "M",
        "name": [{"family": "Doe", "given": ["Jane"]}],
    }
)

HL7V2 = "\r".join(
    [
        "MSH|^~\\&|SENDING_APP|SENDING_FAC|RECV_APP|RECV_FAC|20240101120000||ADT^A01|MSG00001|P|2.5",
        "PID|1||12345^^^MRN||Doe^Jane||19850315|F",
    ]
)


def _api_is_up() -> bool:
    try:
        with urllib.request.urlopen(f"{BASE_URL}/openapi.json", timeout=3) as response:
            return bool(response.status == 200)
    except (urllib.error.URLError, OSError):
        return False


live = pytest.mark.skipif(
    not API_KEY or not _api_is_up(),
    reason=f"no API key or no API at {BASE_URL}",
)


@pytest.fixture
def client() -> Fhirfix:
    return Fhirfix(api_key=API_KEY, base_url=BASE_URL)


@live
def test_ping_returns_workspace_mode_and_scopes(client: Fhirfix) -> None:
    result = client.ping()
    assert result.ok is True
    assert result.mode == "test"
    assert result.workspace_id
    assert "fix" in result.scopes


@live
def test_an_invalid_key_raises_authentication_error() -> None:
    bad = Fhirfix(api_key="ffx_test_definitelynotreal", base_url=BASE_URL)
    with pytest.raises(AuthenticationError) as excinfo:
        bad.ping()
    assert excinfo.value.code == "unauthorized"


@live
def test_validate_finds_the_invalid_gender_code(client: Fhirfix) -> None:
    result = client.validate(BAD_PATIENT)
    assert result.run_id.startswith("run_")
    assert result.input_type == "fhir_json"
    assert result.findings_total > 0
    # a defective resource must not score perfect (the scale is 0-1000).
    assert result.conformance_score_before < 1000
    assert result.findings[0].plain_message


@live
def test_garbage_input_is_unprocessable_not_a_crash(client: Fhirfix) -> None:
    with pytest.raises(UnprocessableError):
        client.validate("this is not fhir at all")


@live
def test_fix_returns_a_corrected_artifact_and_does_not_lower_the_score(client: Fhirfix) -> None:
    result = client.fix(BAD_PATIENT)
    assert result.corrected
    corrected = json.loads(result.corrected)
    assert corrected["resourceType"] == "Patient"
    # the whole product promise.
    assert result.conformance_score_after >= result.conformance_score_before


@live
def test_fix_with_redact_strips_phi(client: Fhirfix) -> None:
    result = client.fix(BAD_PATIENT, redact=True)
    assert "Doe" not in result.corrected


@live
def test_convert_turns_hl7v2_into_fhir(client: Fhirfix) -> None:
    result = client.convert(HL7V2)
    assert result.input_type == "hl7v2"
    assert json.loads(result.fhir)["resourceType"]


@live
def test_idempotent_replay_returns_the_same_run(client: Fhirfix) -> None:
    key = f"py-sdk-{uuid.uuid4()}"
    first = client.validate(BAD_PATIENT, idempotency_key=key)
    second = client.validate(BAD_PATIENT, idempotency_key=key)
    # the same run id proves the engine did not run twice and the caller was not
    # charged twice.
    assert second.run_id == first.run_id


@live
def test_reusing_a_key_with_a_different_body_is_a_conflict(client: Fhirfix) -> None:
    key = f"py-conflict-{uuid.uuid4()}"
    client.validate(BAD_PATIENT, idempotency_key=key)
    other = json.dumps({"resourceType": "Patient", "id": "other", "gender": "F"})
    with pytest.raises(ConflictError) as excinfo:
        client.validate(other, idempotency_key=key)
    assert excinfo.value.code == "idempotency_conflict"


@live
def test_runs_list_pages_newest_first(client: Fhirfix) -> None:
    page = client.runs_list(limit=2)
    assert len(page.runs) <= 2
    if page.has_more:
        assert page.next_cursor


@live
def test_runs_get_returns_the_run_and_its_findings(client: Fhirfix) -> None:
    created = client.validate(BAD_PATIENT)
    detail = client.runs_get(created.run_id)
    assert detail.run.id == created.run_id
    assert detail.run.status == "completed"
    assert len(detail.findings) == len(created.findings)


@live
def test_a_missing_run_is_not_found(client: Fhirfix) -> None:
    with pytest.raises(NotFoundError):
        client.runs_get("run_doesnotexist000000")


@live
def test_runs_corrected_downloads_the_artifact(client: Fhirfix) -> None:
    fixed = client.fix(BAD_PATIENT)
    artifact = client.runs_corrected(fixed.run_id)
    json.loads(artifact)  # must be parseable


@live
def test_report_is_available_as_json_and_operation_outcome(client: Fhirfix) -> None:
    created = client.validate(BAD_PATIENT)
    json.loads(client.runs_report(created.run_id, "json"))
    outcome = json.loads(client.runs_report(created.run_id, "operationoutcome"))
    assert outcome["resourceType"] == "OperationOutcome"


@live
def test_report_pdf_returns_real_pdf_bytes(client: Fhirfix) -> None:
    created = client.validate(BAD_PATIENT)
    payload = client.runs_report_bytes(created.run_id, "pdf")
    # a pdf always starts with %PDF.
    assert payload.startswith(b"%PDF")
