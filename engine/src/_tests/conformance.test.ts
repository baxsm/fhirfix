import { describe, expect, it } from "vitest";
import {
  automatableKits,
  buildCoverageMatrix,
  diffMatrices,
  summarizeMatrix,
  TEST_KITS,
  willAuthenticate,
  type MatrixCell,
  type TestKitDefinition,
} from "../conformance";
import {
  flattenRequirementIds,
  requiredSuiteInputs,
  type InfernoSuite,
  type InfernoTestResult,
} from "../inferno-client";

const kit: TestKitDefinition = {
  id: "plan_net",
  label: "Plan-Net",
  suiteId: "davinci_plan_net_server_v110",
  igIdentifier: "hl7.fhir.us.davinci-pdex-plan-net_1.1.0",
  igVersion: "1.1.0",
  kitVersion: "v0.13.4",
  attended: false,
};

const suite: InfernoSuite = {
  id: "davinci_plan_net_server_v110",
  test_groups: [
    {
      id: "group_a",
      tests: [
        { id: "test_1", verifies_requirements: ["req@1"] },
        { id: "test_2", verifies_requirements: ["req@1", "req@2"] },
      ],
    },
  ],
};

const requirements = [
  { id: "req@1", requirement: "SHALL support search", conformance: "SHALL", actors: ["Server"] },
  { id: "req@2", requirement: "SHOULD paginate", conformance: "SHOULD", actors: ["Server"] },
  { id: "req@3", requirement: "MAY cache", conformance: "MAY", actors: ["Server"] },
];

const result = (id: string, value: InfernoTestResult["result"]): InfernoTestResult => ({
  id: `res_${id}`,
  test_id: id,
  result: value,
});

describe("flattenRequirementIds", () => {
  it("collects test ids per requirement across nested groups", () => {
    const map = flattenRequirementIds(suite);
    expect(map.get("req@1")).toEqual(["test_1", "test_2"]);
    expect(map.get("req@2")).toEqual(["test_2"]);
  });
});

describe("buildCoverageMatrix", () => {
  it("marks a requirement failed when any covering test fails", () => {
    const cells = buildCoverageMatrix(kit, suite, requirements, [
      result("test_1", "pass"),
      result("test_2", "fail"),
    ]);
    expect(cells.find((c) => c.requirementId === "req@1")?.result).toBe("fail");
  });

  it("passes only when every covering test passes", () => {
    const cells = buildCoverageMatrix(kit, suite, requirements, [
      result("test_1", "pass"),
      result("test_2", "pass"),
    ]);
    expect(cells.find((c) => c.requirementId === "req@1")?.result).toBe("pass");
  });

  it("reports an uncovered requirement as skip rather than pass", () => {
    const cells = buildCoverageMatrix(kit, suite, requirements, []);
    expect(cells.find((c) => c.requirementId === "req@3")?.result).toBe("skip");
  });

  it("ranks error above fail as the worst result", () => {
    const cells = buildCoverageMatrix(kit, suite, requirements, [
      result("test_1", "error"),
      result("test_2", "fail"),
    ]);
    expect(cells.find((c) => c.requirementId === "req@1")?.result).toBe("error");
  });

  it("keeps a wait result distinct from a failure", () => {
    const cells = buildCoverageMatrix(kit, suite, requirements, [
      result("test_1", "wait"),
      result("test_2", "pass"),
    ]);
    expect(cells.find((c) => c.requirementId === "req@1")?.result).toBe("wait");
  });

  it("pins the ig identifier onto every cell", () => {
    const cells = buildCoverageMatrix(kit, suite, requirements, []);
    expect(cells.every((c) => c.igIdentifier === kit.igIdentifier)).toBe(true);
  });

  it("carries the failure message from the failing test", () => {
    const cells = buildCoverageMatrix(kit, suite, requirements, [
      { id: "r", test_id: "test_1", result: "fail", result_message: "missing Endpoint" },
    ]);
    expect(cells.find((c) => c.requirementId === "req@1")?.message).toBe("missing Endpoint");
  });
});

describe("summarizeMatrix", () => {
  const cell = (id: string, r: MatrixCell["result"]): MatrixCell => ({
    requirementId: id,
    requirement: id,
    conformance: "SHALL",
    igIdentifier: kit.igIdentifier,
    testKit: "plan_net",
    result: r,
    testIds: [],
  });

  it("counts an error as a failure", () => {
    const summary = summarizeMatrix([cell("a", "pass"), cell("b", "error")]);
    expect(summary.fail).toBe(1);
    expect(summary.overall).toBe("fail");
  });

  it("does not call an all-skip run a pass", () => {
    const summary = summarizeMatrix([cell("a", "skip"), cell("b", "skip")]);
    expect(summary.overall).toBe("partial");
  });

  it("passes when every scored requirement passed", () => {
    const summary = summarizeMatrix([cell("a", "pass"), cell("b", "skip")]);
    expect(summary.overall).toBe("pass");
  });
});

describe("diffMatrices", () => {
  const cell = (id: string, r: MatrixCell["result"]): MatrixCell => ({
    requirementId: id,
    requirement: id,
    conformance: "SHALL",
    igIdentifier: kit.igIdentifier,
    testKit: "plan_net",
    result: r,
    testIds: [],
  });

  it("flags a pass that became a fail as a regression", () => {
    const moves = diffMatrices([cell("a", "pass")], [cell("a", "fail")]);
    expect(moves).toHaveLength(1);
    expect(moves[0]?.direction).toBe("regressed");
  });

  it("flags a fail that became a pass as fixed", () => {
    const moves = diffMatrices([cell("a", "fail")], [cell("a", "pass")]);
    expect(moves[0]?.direction).toBe("fixed");
  });

  it("ignores a requirement that did not cross the pass boundary", () => {
    expect(diffMatrices([cell("a", "fail")], [cell("a", "error")])).toHaveLength(0);
  });

  it("ignores a requirement absent from the previous run", () => {
    expect(diffMatrices([], [cell("a", "fail")])).toHaveLength(0);
  });
});

describe("requiredSuiteInputs", () => {
  const declared: InfernoSuite = {
    id: "s",
    inputs: [
      { name: "url", type: "text" },
      { name: "smart_auth_info", type: "auth_info", optional: true },
      { name: "no_param_search", type: "radio", default: "true" },
      { name: "max_instances", type: "text", default: "200" },
      { name: "extra_ids", type: "text", optional: true },
    ],
  };

  it("fills every required input from its declared default", () => {
    const inputs = requiredSuiteInputs(declared, { url: "https://x/fhir" });
    const names = inputs.map((i) => i.name);
    expect(names).toContain("no_param_search");
    expect(names).toContain("max_instances");
    expect(inputs.find((i) => i.name === "max_instances")?.value).toBe("200");
  });

  it("omits optional inputs that were not provided", () => {
    const inputs = requiredSuiteInputs(declared, { url: "https://x/fhir" });
    expect(inputs.map((i) => i.name)).not.toContain("extra_ids");
  });

  it("includes an optional input once it is provided", () => {
    const inputs = requiredSuiteInputs(declared, {
      url: "https://x/fhir",
      smart_auth_info: "{}",
    });
    expect(inputs.map((i) => i.name)).toContain("smart_auth_info");
  });

  it("lets a caller override a declared default", () => {
    const inputs = requiredSuiteInputs(declared, { url: "https://x/fhir", max_instances: "2" });
    expect(inputs.find((i) => i.name === "max_instances")?.value).toBe("2");
  });
});

describe("willAuthenticate", () => {
  it("accepts a pre-minted access token", () => {
    expect(willAuthenticate({ auth_type: "symmetric", access_token: "abc" })).toBe(true);
  });

  it("accepts backend services with a token url", () => {
    expect(
      willAuthenticate({ auth_type: "backend_services", token_url: "https://x/token" }),
    ).toBe(true);
  });

  it("rejects backend services with no token url", () => {
    expect(willAuthenticate({ auth_type: "backend_services" })).toBe(false);
  });

  // inferno never mints a token from a client secret, so this config would scan
  // unauthenticated and report every requirement as failed
  it("rejects a client secret without a token, which would scan unauthenticated", () => {
    expect(willAuthenticate({ auth_type: "symmetric", token_url: "https://x/token" })).toBe(false);
  });
});

describe("test kit registry", () => {
  it("only offers unattended kits for an automated scan", () => {
    expect(automatableKits().map((k) => k.id)).toEqual(["plan_net", "pdex"]);
  });

  it("gives every attended kit a reason a user can read", () => {
    for (const definition of TEST_KITS.filter((k) => k.attended)) {
      expect(definition.attendedReason).toBeTruthy();
    }
  });
});
