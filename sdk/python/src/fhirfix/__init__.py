"""Python client for the FHIRfix REST API.

Validate, fix, and convert FHIR conformance issues.

    from fhirfix import Fhirfix

    fhirfix = Fhirfix(api_key="ffx_test_...")
    result = fhirfix.fix(input=patient_json)
"""

from ._client import Fhirfix, __version__
from ._errors import (
    APIError,
    AuthenticationError,
    BadRequestError,
    ConflictError,
    ConnectionError,
    FhirfixError,
    NotFoundError,
    OutOfCreditsError,
    PermissionDeniedError,
    RateLimitError,
    ServerError,
    TimeoutError,
    UnprocessableError,
)
from ._types import (
    BatchResult,
    ConvertResult,
    Finding,
    FixResult,
    PingResult,
    Run,
    RunDetail,
    RunPage,
    ValidateResult,
)

# names starting with _ are private under PEP 561, so the public surface is
# re-exported here explicitly.
__all__ = [
    "APIError",
    "AuthenticationError",
    "BadRequestError",
    "BatchResult",
    "ConflictError",
    "ConnectionError",
    "ConvertResult",
    "Fhirfix",
    "FhirfixError",
    "Finding",
    "FixResult",
    "NotFoundError",
    "OutOfCreditsError",
    "PermissionDeniedError",
    "PingResult",
    "RateLimitError",
    "Run",
    "RunDetail",
    "RunPage",
    "ServerError",
    "TimeoutError",
    "UnprocessableError",
    "ValidateResult",
    "__version__",
]
