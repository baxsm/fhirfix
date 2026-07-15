// map a FHIR resourceType to the US Core profile canonical it should validate
// against. this is the default pool's IG (US Core 6.1.0). resources with no US Core
// profile validate against the base spec (empty profile list).

const US_CORE = "http://hl7.org/fhir/us/core/StructureDefinition";

const RESOURCE_TO_USCORE: Record<string, string> = {
  Patient: `${US_CORE}/us-core-patient`,
  Practitioner: `${US_CORE}/us-core-practitioner`,
  Organization: `${US_CORE}/us-core-organization`,
  Encounter: `${US_CORE}/us-core-encounter`,
  Condition: `${US_CORE}/us-core-condition-problems-health-concerns`,
  Observation: `${US_CORE}/us-core-observation-clinical-result`,
  Location: `${US_CORE}/us-core-location`,
  Immunization: `${US_CORE}/us-core-immunization`,
  AllergyIntolerance: `${US_CORE}/us-core-allergyintolerance`,
  Procedure: `${US_CORE}/us-core-procedure`,
  MedicationRequest: `${US_CORE}/us-core-medicationrequest`,
  DiagnosticReport: `${US_CORE}/us-core-diagnosticreport-lab`,
  CarePlan: `${US_CORE}/us-core-careplan`,
  Coverage: `${US_CORE}/us-core-coverage`,
};

export function profileFor(resourceType: string): string | undefined {
  return RESOURCE_TO_USCORE[resourceType];
}

export function allDefaultProfiles(): string[] {
  return Object.values(RESOURCE_TO_USCORE);
}
