import { describe, expect, test } from "bun:test";
import { type DriftSnapshot, detectDrift, scoreToPassRate } from "@shared/db/drift";

function snapshot(over: Partial<DriftSnapshot> = {}): DriftSnapshot {
  return {
    runId: "run_current",
    conformanceScoreAfter: 950,
    errorCount: 0,
    errorFingerprints: [],
    fingerprintLabels: {},
    unmappedAuthorities: [],
    igVersions: { "hl7.fhir.us.core": "6.1.0" },
    ...over,
  };
}

describe("pass rate drop", () => {
  test("fires when the score falls below the configured floor", () => {
    const alerts = detectDrift({
      current: snapshot({ conformanceScoreAfter: 820 }),
      previous: null,
      baseline: { minPassRate: 90 },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.type).toBe("pass_rate_drop");
    expect(alerts[0]?.severity).toBe("error");
    expect(alerts[0]?.metricAfter).toBe("82.0%");
  });

  test("stays quiet when the score is at or above the floor", () => {
    expect(
      detectDrift({
        current: snapshot({ conformanceScoreAfter: 900 }),
        previous: null,
        baseline: { minPassRate: 90 },
      }),
    ).toHaveLength(0);
  });

  test("a score of zero fires rather than being skipped as falsy", () => {
    const alerts = detectDrift({
      current: snapshot({ conformanceScoreAfter: 0 }),
      previous: null,
      baseline: { minPassRate: 50 },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.metricAfter).toBe("0.0%");
  });

  test("no baseline means no pass-rate alert", () => {
    expect(
      detectDrift({
        current: snapshot({ conformanceScoreAfter: 10 }),
        previous: null,
        baseline: null,
      }),
    ).toHaveLength(0);
  });

  test("a run with no score cannot trigger the floor", () => {
    expect(
      detectDrift({
        current: snapshot({ conformanceScoreAfter: null }),
        previous: null,
        baseline: { minPassRate: 90 },
      }),
    ).toHaveLength(0);
  });

  test("reports the previous run's rate as the before metric when there is one", () => {
    const alerts = detectDrift({
      current: snapshot({ conformanceScoreAfter: 700 }),
      previous: snapshot({ runId: "run_prev", conformanceScoreAfter: 990 }),
      baseline: { minPassRate: 90 },
    });
    expect(alerts[0]?.metricBefore).toBe("99.0%");
  });
});

describe("error delta", () => {
  test("fires when errors grow past the allowed delta", () => {
    const alerts = detectDrift({
      current: snapshot({ errorCount: 12 }),
      previous: snapshot({ runId: "run_prev", errorCount: 5 }),
      baseline: { maxErrorDelta: 3 },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.metricBefore).toBe("5");
    expect(alerts[0]?.metricAfter).toBe("12");
  });

  test("growth exactly at the limit is allowed", () => {
    expect(
      detectDrift({
        current: snapshot({ errorCount: 8 }),
        previous: snapshot({ runId: "run_prev", errorCount: 5 }),
        baseline: { maxErrorDelta: 3 },
      }),
    ).toHaveLength(0);
  });

  test("a drop in errors never alerts", () => {
    expect(
      detectDrift({
        current: snapshot({ errorCount: 1 }),
        previous: snapshot({ runId: "run_prev", errorCount: 20 }),
        baseline: { maxErrorDelta: 0 },
      }),
    ).toHaveLength(0);
  });

  test("needs a previous run to compare against", () => {
    expect(
      detectDrift({
        current: snapshot({ errorCount: 99 }),
        previous: null,
        baseline: { maxErrorDelta: 0 },
      }),
    ).toHaveLength(0);
  });
});

describe("new error class", () => {
  test("fires for a fingerprint absent from the previous run", () => {
    const alerts = detectDrift({
      current: snapshot({
        errorFingerprints: ["fp_known", "fp_new"],
        fingerprintLabels: { fp_new: "Patient.identifier is missing a system." },
      }),
      previous: snapshot({ runId: "run_prev", errorFingerprints: ["fp_known"] }),
      baseline: null,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.type).toBe("new_error_class");
    expect(alerts[0]?.detail).toBe("Patient.identifier is missing a system.");
  });

  test("a repeat of the same class is not new", () => {
    expect(
      detectDrift({
        current: snapshot({ errorFingerprints: ["fp_a", "fp_b"] }),
        previous: snapshot({ runId: "run_prev", errorFingerprints: ["fp_a", "fp_b"] }),
        baseline: null,
      }),
    ).toHaveLength(0);
  });

  test("the first run of a check does not alert on every class it finds", () => {
    expect(
      detectDrift({
        current: snapshot({ errorFingerprints: ["fp_a", "fp_b", "fp_c"] }),
        previous: null,
        baseline: null,
      }),
    ).toHaveLength(0);
  });

  test("fires without any baseline configured", () => {
    const alerts = detectDrift({
      current: snapshot({ errorFingerprints: ["fp_new"] }),
      previous: snapshot({ runId: "run_prev", errorFingerprints: [] }),
      baseline: null,
    });
    expect(alerts).toHaveLength(1);
  });
});

describe("unmapped authority", () => {
  test("fires once per distinct authority", () => {
    const alerts = detectDrift({
      current: snapshot({ unmappedAuthorities: ["DRNBR", "NHSNBR", "DRNBR"] }),
      previous: null,
      baseline: null,
    });
    expect(alerts).toHaveLength(2);
    expect(alerts.every((a) => a.type === "unmapped_authority")).toBe(true);
    expect(alerts.map((a) => a.metricAfter)).toEqual(["DRNBR", "NHSNBR"]);
  });

  test("fires on a first run, unlike new-error-class", () => {
    expect(
      detectDrift({
        current: snapshot({ unmappedAuthorities: ["DRNBR"] }),
        previous: null,
        baseline: null,
      }),
    ).toHaveLength(1);
  });

  test("empty authority strings are ignored", () => {
    expect(
      detectDrift({
        current: snapshot({ unmappedAuthorities: ["", ""] }),
        previous: null,
        baseline: null,
      }),
    ).toHaveLength(0);
  });
});

describe("ig version change", () => {
  test("fires when a package version moves between runs", () => {
    const alerts = detectDrift({
      current: snapshot({ igVersions: { "hl7.fhir.us.core": "7.0.0" } }),
      previous: snapshot({
        runId: "run_prev",
        igVersions: { "hl7.fhir.us.core": "6.1.0" },
      }),
      baseline: null,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.type).toBe("ig_version_change");
    expect(alerts[0]?.metricBefore).toBe("hl7.fhir.us.core 6.1.0");
    expect(alerts[0]?.metricAfter).toBe("hl7.fhir.us.core 7.0.0");
  });

  test("an unchanged version is silent", () => {
    expect(
      detectDrift({
        current: snapshot({ igVersions: { "hl7.fhir.us.core": "6.1.0" } }),
        previous: snapshot({ runId: "run_prev", igVersions: { "hl7.fhir.us.core": "6.1.0" } }),
        baseline: null,
      }),
    ).toHaveLength(0);
  });

  test("a newly added package is not a version change", () => {
    expect(
      detectDrift({
        current: snapshot({
          igVersions: { "hl7.fhir.us.core": "6.1.0", "hl7.fhir.us.davinci-pas": "2.0.1" },
        }),
        previous: snapshot({ runId: "run_prev", igVersions: { "hl7.fhir.us.core": "6.1.0" } }),
        baseline: null,
      }),
    ).toHaveLength(0);
  });
});

describe("combined", () => {
  test("a healthy run produces no alerts at all", () => {
    expect(
      detectDrift({
        current: snapshot(),
        previous: snapshot({ runId: "run_prev" }),
        baseline: { minPassRate: 90, maxErrorDelta: 2 },
      }),
    ).toHaveLength(0);
  });

  test("independent regressions each get their own alert", () => {
    const alerts = detectDrift({
      current: snapshot({
        conformanceScoreAfter: 500,
        errorCount: 10,
        errorFingerprints: ["fp_new"],
        unmappedAuthorities: ["DRNBR"],
        igVersions: { "hl7.fhir.us.core": "7.0.0" },
      }),
      previous: snapshot({
        runId: "run_prev",
        errorCount: 1,
        errorFingerprints: [],
        igVersions: { "hl7.fhir.us.core": "6.1.0" },
      }),
      baseline: { minPassRate: 90, maxErrorDelta: 2 },
    });
    expect(alerts.map((a) => a.type).sort()).toEqual([
      "ig_version_change",
      "new_error_class",
      "pass_rate_drop",
      "pass_rate_drop",
      "unmapped_authority",
    ]);
  });
});

describe("score scaling", () => {
  test("converts the engine's 0-1000 scale to a percentage", () => {
    expect(scoreToPassRate(1000)).toBe(100);
    expect(scoreToPassRate(0)).toBe(0);
    expect(scoreToPassRate(875)).toBe(87.5);
  });
});
