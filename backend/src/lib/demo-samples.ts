export interface DemoSample {
  id: string;
  label: string;
  kind: "fhir_json" | "hl7v2";
  description: string;
  content: string;
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "patient-naive",
    label: "US Core Patient (naive)",
    kind: "fhir_json",
    description: "Identifier type code with no system, HL7-style gender code, placeholder system.",
    content: JSON.stringify(
      {
        resourceType: "Patient",
        id: "example",
        identifier: [
          {
            type: { coding: [{ code: "MRN" }] },
            system: "http://example.com/v2-to-fhir-converter/Identifier/SIMULATOR-MRN",
            value: "10009",
          },
        ],
        name: [{ family: "Chalmers", given: ["Peter"] }],
        gender: "M",
        birthDate: "19740312",
      },
      null,
      2,
    ),
  },
  {
    id: "adt-a01",
    label: "HL7v2 ADT^A01 admit",
    kind: "hl7v2",
    description: "A raw v2 admit message converted to FHIR, then remediated to US Core.",
    content: [
      "MSH|^~\\&|SIMULATOR|SIM|RECEIVER|RCV|20240115093000||ADT^A01|MSG00001|P|2.5",
      "EVN|A01|20240115093000",
      "PID|1||10009^^^SIMULATOR-MRN^MR||Chalmers^Peter^James||19740312|M|||534 Erewhon St^^PleasantVille^VIC^3999",
      "PV1|1|I|2000^2012^01||||004777^Attend^Aaron^A|||SUR||||ADM|A0",
    ].join("\r"),
  },
];
