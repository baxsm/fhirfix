export interface Sample {
  id: string;
  label: string;
  kind: "FHIR" | "HL7v2";
  hint: string;
  content: string;
}

const NAIVE_PATIENT = {
  resourceType: "Patient",
  id: "golden",
  identifier: [
    {
      type: { coding: [{ code: "MRN", display: "MRN" }] },
      system: "http://example.com/v2-to-fhir-converter/Identifier/SIMULATOR-MRN",
      value: "3735064194",
    },
  ],
  name: [{ family: "Esterkin", given: ["AKI"] }],
  gender: "female",
  birthDate: "1987-01-12",
};

const HL7_ADT = [
  "MSH|^~\\&|SIMHOSP|SFAC|RAPP|RFAC|20200508131015||ADT^A01|517|T|2.3|||AL||44|ASCII",
  "EVN|A01|20200508131015|||C005^Whittingham^Sylvia^^^Dr^^^DRNBR^PRSNL^^^ORGDR|",
  "PID|1|3735064194^^^SIMULATOR MRN^MRN|3735064194^^^SIMULATOR MRN^MRN~2021051528^^^NHSNBR^NHSNMBR||Esterkin^AKI Scenario 6^^^Miss^^CURRENT||19870112000000|F|||170 Juice Place^^London^^E1 1AA^GBR^HOME||020 3614 5541^HOME|||||||||C^White - British^^^|||||||||",
  "PV1|1|I|OtherWard^MainRoom^Bed 183^Simulated Hospital^^BED^Main Building^4|28b|||C005^Whittingham^Sylvia^^^Dr|||CAR|||||||||16094728916771313876^^^^visitid||||||||||||||||||||||ARRIVED|||20200508131015||",
].join("\n");

export const SAMPLES: Sample[] = [
  {
    id: "naive-patient",
    label: "US Core Patient (converter output)",
    kind: "FHIR",
    hint: "Placeholder identifier system + a code with no system, exactly as the v2 converter emits.",
    content: JSON.stringify(NAIVE_PATIENT, null, 2),
  },
  {
    id: "hl7-adt",
    label: "HL7v2 ADT^A01 admit",
    kind: "HL7v2",
    hint: "A raw v2 admit message. The engine converts it to FHIR, then remediates.",
    content: HL7_ADT,
  },
];
