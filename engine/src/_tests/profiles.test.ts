import { describe, expect, it } from "vitest";
import { profileFor, profilesForResource } from "../profiles";

const US_CORE = "http://hl7.org/fhir/us/core/StructureDefinition";

// the five profiles the engine auto-picks for an HL7v2 ADT^A01 bundle. this list
// gets written to run.profilesApplied. it used to be handed back as an explicit
// override on the apply path, which is how every resource ended up validated
// against all five; re-apply now reads run.profilesRequested instead. narrowing
// still matters for a caller who really did pin a bundle-wide list.
const FIVE = [
  `${US_CORE}/us-core-organization`,
  `${US_CORE}/us-core-patient`,
  `${US_CORE}/us-core-practitioner`,
  `${US_CORE}/us-core-location`,
  `${US_CORE}/us-core-encounter`,
];

describe("profileFor", () => {
  it("maps a resource type to its us core profile", () => {
    expect(profileFor("Location")).toBe(`${US_CORE}/us-core-location`);
  });

  it("returns undefined for a type with no us core profile", () => {
    expect(profileFor("MessageHeader")).toBeUndefined();
  });
});

describe("profilesForResource", () => {
  it("keeps only this resource's profile out of a bundle-wide list", () => {
    expect(profilesForResource("Location", FIVE)).toEqual([`${US_CORE}/us-core-location`]);
    expect(profilesForResource("Patient", FIVE)).toEqual([`${US_CORE}/us-core-patient`]);
  });

  it("drops every profile for a type with no us core profile", () => {
    // MessageHeader/Provenance are in the converter's output but have no us core
    // profile, so they must validate against the base spec, not another type's.
    expect(profilesForResource("MessageHeader", FIVE)).toEqual([]);
    expect(profilesForResource("Provenance", FIVE)).toEqual([]);
  });

  it("keeps an unknown profile so a custom IG still applies", () => {
    const custom = "http://example.org/StructureDefinition/my-location";
    expect(profilesForResource("Location", [custom])).toEqual([custom]);
  });

  it("matches a versioned canonical", () => {
    expect(profilesForResource("Location", [`${US_CORE}/us-core-location|6.1.0`])).toEqual([
      `${US_CORE}/us-core-location|6.1.0`,
    ]);
  });

  it("does not give a Location the organization profile", () => {
    expect(profilesForResource("Location", FIVE)).not.toContain(`${US_CORE}/us-core-organization`);
  });
});
