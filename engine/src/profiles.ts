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

// keep only the profiles that belong to this resourceType. a caller-supplied list
// covers a whole bundle, so handing every profile to every resource makes the
// validator report a type mismatch ("profile type was 'Organization' ... found
// 'Location'") for each resource the profile was never meant for. an unknown
// profile is kept: it may be a custom IG this map does not know about, and only
// the resource it targets should be affected.
export function profilesForResource(resourceType: string, candidates: string[]): string[] {
  const own = RESOURCE_TO_USCORE[resourceType];
  const knownOther = new Set(
    Object.entries(RESOURCE_TO_USCORE)
      .filter(([rt]) => rt !== resourceType)
      .map(([, canonical]) => canonical),
  );
  return candidates.filter((c) => {
    const base = c.split("|")[0] ?? c;
    if (base === own) return true;
    return !knownOther.has(base);
  });
}
