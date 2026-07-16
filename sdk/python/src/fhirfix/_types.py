"""Wire types for the public REST API.

These mirror backend/src/routes/api-v1. Dataclasses rather than raw dicts so an
editor can complete the fields and a typo fails at import time, not in prod.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

Severity = Literal["error", "warning", "info"]

FindingCategory = Literal[
    "structural",
    "profile",
    "terminology",
    "cardinality",
    "invariant",
    "reference",
    "must_support",
]

FixConfidence = Literal["auto", "one_click", "manual"]

FixStatus = Literal["applied", "suggested", "skipped", "manual_needed", "dismissed"]

InputType = Literal["hl7v2", "fhir_json", "fhir_xml", "ndjson", "bundle", "zip"]

RunStatus = Literal["queued", "running", "completed", "failed"]

KeyMode = Literal["test", "live"]

ReportFormat = Literal["json", "operationoutcome", "pdf"]


@dataclass(frozen=True)
class Finding:
    """A single conformance problem."""

    severity: Severity
    category: FindingCategory
    resource_type: str | None
    fhirpath: str | None
    rule_source: str
    spec_citation: str
    plain_message: str
    suggested_fix: str
    fix_confidence: FixConfidence
    fix_status: FixStatus
    occurrence_count: int

    @staticmethod
    def from_json(data: dict[str, Any]) -> Finding:
        return Finding(
            severity=data["severity"],
            category=data["category"],
            resource_type=data.get("resourceType"),
            fhirpath=data.get("fhirpath"),
            rule_source=data.get("ruleSource", ""),
            spec_citation=data.get("specCitation", ""),
            plain_message=data.get("plainMessage", ""),
            suggested_fix=data.get("suggestedFix", ""),
            fix_confidence=data.get("fixConfidence", "manual"),
            fix_status=data.get("fixStatus", "suggested"),
            occurrence_count=data.get("occurrenceCount", 1),
        )


@dataclass(frozen=True)
class ValidateResult:
    run_id: str
    status: str
    input_type: InputType
    resource_count: int
    conformance_score_before: int
    findings_total: int
    findings_auto_fixable: int
    findings: list[Finding] = field(default_factory=list)

    @staticmethod
    def from_json(data: dict[str, Any]) -> ValidateResult:
        return ValidateResult(
            run_id=data["runId"],
            status=data.get("status", "completed"),
            input_type=data.get("inputType", "fhir_json"),
            resource_count=data.get("resourceCount", 0),
            conformance_score_before=data.get("conformanceScoreBefore", 0),
            findings_total=data.get("findingsTotal", 0),
            findings_auto_fixable=data.get("findingsAutoFixable", 0),
            findings=[Finding.from_json(f) for f in data.get("findings", [])],
        )


@dataclass(frozen=True)
class FixResult:
    run_id: str
    status: str
    input_type: InputType
    resource_count: int
    conformance_score_before: int
    conformance_score_after: int
    re_verified_clean: bool
    findings_total: int
    findings_auto_fixable: int
    findings: list[Finding]
    #: the corrected artifact, serialized json.
    corrected: str

    @staticmethod
    def from_json(data: dict[str, Any]) -> FixResult:
        return FixResult(
            run_id=data["runId"],
            status=data.get("status", "completed"),
            input_type=data.get("inputType", "fhir_json"),
            resource_count=data.get("resourceCount", 0),
            conformance_score_before=data.get("conformanceScoreBefore", 0),
            conformance_score_after=data.get("conformanceScoreAfter", 0),
            re_verified_clean=data.get("reVerifiedClean", False),
            findings_total=data.get("findingsTotal", 0),
            findings_auto_fixable=data.get("findingsAutoFixable", 0),
            findings=[Finding.from_json(f) for f in data.get("findings", [])],
            corrected=data.get("corrected", ""),
        )


@dataclass(frozen=True)
class ConvertResult:
    run_id: str
    status: str
    input_type: InputType
    resource_count: int
    #: the converted FHIR, serialized json.
    fhir: str
    findings: list[Finding]

    @staticmethod
    def from_json(data: dict[str, Any]) -> ConvertResult:
        return ConvertResult(
            run_id=data["runId"],
            status=data.get("status", "completed"),
            input_type=data.get("inputType", "hl7v2"),
            resource_count=data.get("resourceCount", 0),
            fhir=data.get("fhir", ""),
            findings=[Finding.from_json(f) for f in data.get("findings", [])],
        )


@dataclass(frozen=True)
class BatchResult:
    run_id: str
    status: str

    @staticmethod
    def from_json(data: dict[str, Any]) -> BatchResult:
        return BatchResult(run_id=data["runId"], status=data.get("status", "queued"))


@dataclass(frozen=True)
class Run:
    id: str
    status: RunStatus
    input_type: InputType
    source: str
    resource_count: int
    conformance_score_before: int | None
    conformance_score_after: int | None
    findings_total: int
    findings_auto_fixable: int
    credits_charged: int
    error_message: str | None
    created_at: str | None
    completed_at: str | None

    @staticmethod
    def from_json(data: dict[str, Any]) -> Run:
        return Run(
            id=data["id"],
            status=data.get("status", "completed"),
            input_type=data.get("inputType", "fhir_json"),
            source=data.get("source", "api"),
            resource_count=data.get("resourceCount", 0),
            conformance_score_before=data.get("conformanceScoreBefore"),
            conformance_score_after=data.get("conformanceScoreAfter"),
            findings_total=data.get("findingsTotal", 0),
            findings_auto_fixable=data.get("findingsAutoFixable", 0),
            credits_charged=data.get("creditsCharged", 0),
            error_message=data.get("errorMessage"),
            created_at=data.get("createdAt"),
            completed_at=data.get("completedAt"),
        )


@dataclass(frozen=True)
class RunDetail:
    run: Run
    findings: list[Finding]

    @staticmethod
    def from_json(data: dict[str, Any]) -> RunDetail:
        return RunDetail(
            run=Run.from_json(data["run"]),
            findings=[Finding.from_json(f) for f in data.get("findings", [])],
        )


@dataclass(frozen=True)
class RunPage:
    runs: list[Run]
    next_cursor: str | None
    has_more: bool

    @staticmethod
    def from_json(data: dict[str, Any]) -> RunPage:
        return RunPage(
            runs=[Run.from_json(r) for r in data.get("runs", [])],
            next_cursor=data.get("nextCursor"),
            has_more=data.get("hasMore", False),
        )


@dataclass(frozen=True)
class PingResult:
    ok: bool
    workspace_id: str
    mode: KeyMode
    scopes: list[str]

    @staticmethod
    def from_json(data: dict[str, Any]) -> PingResult:
        return PingResult(
            ok=data.get("ok", False),
            workspace_id=data.get("workspaceId", ""),
            mode=data.get("mode", "test"),
            scopes=data.get("scopes", []),
        )
