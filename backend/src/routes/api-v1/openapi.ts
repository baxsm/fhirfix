// hand-written OpenAPI 3.1 spec for the public REST API. hand-written (not
// generated) because the surface is small and stable; served at
// /api/v1/openapi.json for SDK codegen + the docs try-it playground. keep this in
// sync with the controllers when endpoints change.

const finding = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["error", "warning", "info"] },
    category: { type: "string" },
    resourceType: { type: "string", nullable: true },
    fhirpath: { type: "string", nullable: true },
    ruleSource: { type: "string" },
    specCitation: { type: "string" },
    plainMessage: { type: "string" },
    suggestedFix: { type: "string" },
    fixConfidence: { type: "string", enum: ["auto", "one_click", "manual"] },
    fixStatus: { type: "string" },
    occurrenceCount: { type: "integer" },
  },
} as const;

const runBody = {
  type: "object",
  required: ["input"],
  properties: {
    input: { type: "string", description: "A FHIR resource/bundle or HL7v2 message." },
    profiles: { type: "array", items: { type: "string" } },
    redact: { type: "boolean", description: "Redact PHI from the corrected output." },
  },
} as const;

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "FHIRfix REST API",
    version: "1.0.0",
    description:
      "Validate, fix, and convert FHIR conformance issues. Authenticate with an API key as a Bearer token.",
  },
  servers: [{ url: "/api/v1" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "ffx_live_... / ffx_test_..." },
    },
    schemas: { Finding: finding, RunBody: runBody },
  },
  paths: {
    "/validate": {
      post: {
        summary: "Validate a resource, bundle, or message. No fixes applied.",
        requestBody: { required: true, content: { "application/json": { schema: runBody } } },
        responses: {
          "200": {
            description: "Findings + score.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    runId: { type: "string" },
                    status: { type: "string" },
                    conformanceScoreBefore: { type: "integer" },
                    findingsTotal: { type: "integer" },
                    findings: { type: "array", items: finding },
                  },
                },
              },
            },
          },
          "401": { description: "Missing or invalid API key." },
          "402": { description: "Out of credits." },
          "422": { description: "Input is not a recognized FHIR/HL7 shape." },
          "429": { description: "Rate limited." },
        },
      },
    },
    "/fix": {
      post: {
        summary: "Validate, apply safe fixes, re-verify. Returns the corrected artifact.",
        requestBody: { required: true, content: { "application/json": { schema: runBody } } },
        responses: {
          "200": {
            description: "Corrected artifact + before/after score.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    runId: { type: "string" },
                    conformanceScoreBefore: { type: "integer" },
                    conformanceScoreAfter: { type: "integer" },
                    reVerifiedClean: { type: "boolean" },
                    findings: { type: "array", items: finding },
                    corrected: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/convert": {
      post: {
        summary: "Convert HL7v2 / C-CDA to FHIR, applying the workspace mapping registry.",
        requestBody: { required: true, content: { "application/json": { schema: runBody } } },
        responses: { "200": { description: "The converted FHIR." } },
      },
    },
    "/batch": {
      post: {
        summary: "Submit a large input as a single async run. Returns immediately.",
        requestBody: { required: true, content: { "application/json": { schema: runBody } } },
        responses: {
          "202": { description: "Queued. Poll GET /runs/{id} or receive a run.completed webhook." },
        },
      },
    },
    "/runs": {
      get: {
        summary: "List runs (cursor pagination + status/inputType/from/to filters).",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "inputType", in: "query", schema: { type: "string" } },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "A page of runs + nextCursor." } },
      },
    },
    "/runs/{id}": {
      get: {
        summary: "Fetch a run and its findings.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "The run + findings." },
          "404": { description: "Not found." },
        },
      },
    },
    "/runs/{id}/corrected": {
      get: {
        summary: "Download the corrected artifact (application/octet-stream).",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "The corrected FHIR bytes." } },
      },
    },
    "/runs/{id}/report": {
      get: {
        summary: "The report as json | operationoutcome | pdf.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          {
            name: "format",
            in: "query",
            schema: { type: "string", enum: ["json", "operationoutcome", "pdf"] },
          },
        ],
        responses: { "200": { description: "The report in the requested format." } },
      },
    },
  },
} as const;
