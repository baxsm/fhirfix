import { describe, expect, it } from "vitest";
import { type ExportRow, parseCsv, toCsv, toJson } from "../mapping-csv";

const row = (over: Partial<ExportRow> = {}): ExportRow => ({
  type: "authority_to_system",
  sourceValue: "MRN",
  targetValue: "http://hospital.example.org/mrn",
  targetSystem: null,
  scope: "workspace",
  sourceSystem: null,
  ...over,
});

describe("toCsv", () => {
  it("writes the header even with no rows", () => {
    expect(toCsv([])).toBe("type,sourceValue,targetValue,targetSystem,scope,sourceSystem\n");
  });

  it("writes null as an empty cell, not the string null", () => {
    const line = toCsv([row()]).split("\n")[1];
    expect(line).toBe("authority_to_system,MRN,http://hospital.example.org/mrn,,workspace,");
  });

  it("quotes a value containing a comma", () => {
    const line = toCsv([row({ targetValue: "a,b" })]).split("\n")[1];
    expect(line).toContain('"a,b"');
  });

  it("doubles an inner quote", () => {
    const line = toCsv([row({ sourceValue: 'he said "hi"' })]).split("\n")[1];
    expect(line).toContain('"he said ""hi"""');
  });
});

describe("parseCsv", () => {
  it("round-trips what toCsv produced", () => {
    const rows = [
      row(),
      row({ type: "code_to_code", sourceValue: "M", targetValue: "male", targetSystem: "v2-0001" }),
      row({ scope: "source_system", sourceSystem: "epic-prod", sourceValue: "X,Y" }),
      row({ sourceValue: 'quote " and\nnewline' }),
    ];
    expect(parseCsv(toCsv(rows))).toEqual({ rows, errors: [] });
  });

  it("reports a missing required column and stops", () => {
    const out = parseCsv("type,sourceValue\nauthority_to_system,MRN\n");
    expect(out.rows).toEqual([]);
    expect(out.errors[0]?.reason).toContain("targetValue");
  });

  it("keeps good rows and reports only the bad ones", () => {
    const csv = [
      "type,sourceValue,targetValue,targetSystem,scope,sourceSystem",
      "authority_to_system,MRN,http://a,,workspace,",
      "not_a_type,X,http://b,,workspace,",
      "code_to_code,,http://c,,workspace,",
      "code_to_code,Z,http://d,,workspace,",
    ].join("\n");
    const out = parseCsv(csv);
    expect(out.rows.map((r) => r.sourceValue)).toEqual(["MRN", "Z"]);
    expect(out.errors.map((e) => e.line)).toEqual([3, 4]);
  });

  it("rejects a source_system row with no source system", () => {
    const csv = [
      "type,sourceValue,targetValue,targetSystem,scope,sourceSystem",
      "code_to_code,A,B,,source_system,",
    ].join("\n");
    const out = parseCsv(csv);
    expect(out.rows).toEqual([]);
    expect(out.errors[0]?.reason).toContain("needs a sourceSystem");
  });

  it("drops a source system that a workspace-scoped row should not carry", () => {
    const csv = [
      "type,sourceValue,targetValue,targetSystem,scope,sourceSystem",
      "code_to_code,A,B,,workspace,epic-prod",
    ].join("\n");
    expect(parseCsv(csv).rows[0]?.sourceSystem).toBeNull();
  });

  it("ignores a utf-8 bom, which excel writes", () => {
    const csv = `﻿type,sourceValue,targetValue,targetSystem,scope,sourceSystem\ncode_to_code,A,B,,workspace,\n`;
    expect(parseCsv(csv).rows).toHaveLength(1);
  });

  it("handles crlf line endings", () => {
    const csv = "type,sourceValue,targetValue,targetSystem,scope,sourceSystem\r\ncode_to_code,A,B,,workspace,\r\n";
    expect(parseCsv(csv).rows).toHaveLength(1);
  });

  it("skips blank lines rather than counting them as rows", () => {
    const csv = "type,sourceValue,targetValue,targetSystem,scope,sourceSystem\n\ncode_to_code,A,B,,workspace,\n\n";
    expect(parseCsv(csv).rows).toHaveLength(1);
  });

  it("calls an empty file empty", () => {
    expect(parseCsv("").errors[0]?.reason).toBe("the file is empty");
  });

  it("flags an unterminated quote", () => {
    const csv = 'type,sourceValue,targetValue,targetSystem,scope,sourceSystem\ncode_to_code,"A,B,,workspace,';
    expect(parseCsv(csv).errors.some((e) => e.reason === "unterminated quote")).toBe(true);
  });

  it("tolerates columns in a different order", () => {
    const csv = [
      "sourceValue,type,scope,targetValue,sourceSystem,targetSystem",
      "MRN,authority_to_system,workspace,http://a,,",
    ].join("\n");
    expect(parseCsv(csv).rows[0]).toEqual(row({ targetValue: "http://a" }));
  });
});

describe("toJson", () => {
  it("round-trips through JSON.parse", () => {
    const rows = [row(), row({ scope: "source_system", sourceSystem: "epic" })];
    expect(JSON.parse(toJson(rows))).toEqual(rows);
  });
});
