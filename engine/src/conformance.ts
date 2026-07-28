import {
  flattenRequirementIds,
  type InfernoRequirement,
  type InfernoResult,
  type InfernoSuite,
  type InfernoTestResult,
} from "./inferno-client";

export type TestKitId = "plan_net" | "pdex" | "pas" | "crd" | "dtr";

export interface TestKitDefinition {
  id: TestKitId;
  label: string;
  suiteId: string;
  igIdentifier: string;
  igVersion: string;
  kitVersion: string;
  // an attended kit needs a human to supply requests, so a scan cannot score it
  attended: boolean;
  attendedReason?: string;
}

export const TEST_KITS: TestKitDefinition[] = [
  {
    id: "plan_net",
    label: "Da Vinci Plan-Net",
    suiteId: "davinci_plan_net_server_v110",
    igIdentifier: "hl7.fhir.us.davinci-pdex-plan-net_1.1.0",
    igVersion: "1.1.0",
    kitVersion: "v0.13.4",
    attended: false,
  },
  {
    id: "pdex",
    label: "Da Vinci PDex Payer Server",
    suiteId: "pdex_payer_server",
    igIdentifier: "hl7.fhir.us.davinci-pdex_2.0.0",
    igVersion: "2.0.0",
    kitVersion: "v0.13.1",
    attended: false,
  },
  {
    id: "pas",
    label: "Da Vinci PAS Server",
    suiteId: "davinci_pas_server_suite_v201",
    igIdentifier: "hl7.fhir.us.davinci-pas_2.0.1",
    igVersion: "2.0.1",
    kitVersion: "v0.15.1",
    attended: true,
    attendedReason:
      "PAS requires a tester to supply the prior-auth requests Inferno sends, so it cannot be scored by an unattended scan.",
  },
  {
    id: "crd",
    label: "Da Vinci CRD",
    suiteId: "crd_server",
    igIdentifier: "hl7.fhir.us.davinci-crd_2.0.1",
    igVersion: "2.0.1",
    kitVersion: "v0.14.1",
    attended: true,
    attendedReason:
      "CRD tests a provider-facing hook workflow that Inferno drives interactively, not a scannable endpoint.",
  },
  {
    id: "dtr",
    label: "Da Vinci DTR",
    suiteId: "dtr_full_ehr",
    igIdentifier: "hl7.fhir.us.davinci-dtr_2.0.1",
    igVersion: "2.0.1",
    kitVersion: "v0.17.1",
    attended: true,
    attendedReason:
      "DTR requires a launched questionnaire session driven by a human, so it cannot run unattended.",
  },
];

export function automatableKits(): TestKitDefinition[] {
  return TEST_KITS.filter((kit) => !kit.attended);
}

// any other config makes inferno scan unauthenticated instead of getting a token
export function willAuthenticate(auth: {
  auth_type?: string;
  token_url?: string;
  access_token?: string;
}): boolean {
  if (auth.access_token) return true;
  return auth.auth_type === "backend_services" && !!auth.token_url;
}

export interface MatrixCell {
  requirementId: string;
  requirement: string;
  conformance: string;
  igIdentifier: string;
  testKit: TestKitId;
  result: InfernoResult;
  testIds: string[];
  message?: string;
}

export interface MatrixSummary {
  total: number;
  pass: number;
  fail: number;
  skip: number;
  other: number;
  overall: "pass" | "fail" | "partial";
}

export interface RegressionEntry {
  requirementId: string;
  testKit: TestKitId;
  requirement: string;
  from: InfernoResult;
  to: InfernoResult;
  direction: "fixed" | "regressed";
}

const SEVERITY_ORDER: InfernoResult[] = [
  "error",
  "fail",
  "wait",
  "running",
  "cancel",
  "skip",
  "omit",
  "pass",
];

// the most severe covering result must win, or a failure hides behind a pass
function worstResult(results: InfernoResult[]): InfernoResult {
  for (const candidate of SEVERITY_ORDER) {
    if (results.includes(candidate)) return candidate;
  }
  return "skip";
}

export function buildCoverageMatrix(
  kit: TestKitDefinition,
  suite: InfernoSuite,
  requirements: InfernoRequirement[],
  results: InfernoTestResult[],
): MatrixCell[] {
  const testsByRequirement = flattenRequirementIds(suite);
  const resultByTestId = new Map<string, InfernoTestResult>();
  for (const result of results) {
    const key = result.test_id ?? result.test_group_id ?? result.test_suite_id;
    if (key) resultByTestId.set(key, result);
  }

  return requirements.map((requirement) => {
    const testIds = testsByRequirement.get(requirement.id) ?? [];
    const observed: InfernoResult[] = [];
    let message: string | undefined;
    for (const testId of testIds) {
      const result = resultByTestId.get(testId);
      if (!result) continue;
      observed.push(result.result);
      if (!message && (result.result === "fail" || result.result === "error")) {
        message = result.result_message;
      }
    }
    return {
      requirementId: requirement.id,
      requirement: requirement.requirement,
      conformance: requirement.conformance,
      igIdentifier: kit.igIdentifier,
      testKit: kit.id,
      result: observed.length > 0 ? worstResult(observed) : "skip",
      testIds,
      message,
    };
  });
}

export function summarizeMatrix(cells: MatrixCell[]): MatrixSummary {
  let pass = 0;
  let fail = 0;
  let skip = 0;
  let other = 0;
  for (const cell of cells) {
    if (cell.result === "pass") pass++;
    else if (cell.result === "fail" || cell.result === "error") fail++;
    else if (cell.result === "skip" || cell.result === "omit") skip++;
    else other++;
  }
  const scored = pass + fail;
  let overall: MatrixSummary["overall"] = "partial";
  if (fail > 0) overall = "fail";
  else if (scored > 0 && pass === scored) overall = "pass";
  return { total: cells.length, pass, fail, skip, other, overall };
}

function cellKey(cell: MatrixCell): string {
  return `${cell.testKit}::${cell.requirementId}`;
}

export function diffMatrices(previous: MatrixCell[], current: MatrixCell[]): RegressionEntry[] {
  const before = new Map(previous.map((cell) => [cellKey(cell), cell]));
  const moves: RegressionEntry[] = [];
  for (const cell of current) {
    const prior = before.get(cellKey(cell));
    if (!prior || prior.result === cell.result) continue;
    const wasPass = prior.result === "pass";
    const isPass = cell.result === "pass";
    if (wasPass === isPass) continue;
    moves.push({
      requirementId: cell.requirementId,
      testKit: cell.testKit,
      requirement: cell.requirement,
      from: prior.result,
      to: cell.result,
      direction: isPass ? "fixed" : "regressed",
    });
  }
  return moves;
}
