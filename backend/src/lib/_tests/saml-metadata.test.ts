import { describe, expect, test } from "bun:test";
import { certFingerprint, parseIdpMetadata } from "@/lib/saml-metadata";

// a real keycloak 26.7 descriptor, trimmed to the elements we read
const KEYCLOAK = `<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://localhost:8180/realms/fhirfix">
<IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
<KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data>
<ds:X509Certificate>MIICnTCCAYUCBgGf
  tbGFdjANBgkq</ds:X509Certificate></ds:X509Data></ds:KeyInfo></KeyDescriptor>
<SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://localhost:8180/realms/fhirfix/protocol/saml"/>
<SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:8180/realms/fhirfix/protocol/saml"/>
</IDPSSODescriptor></EntityDescriptor>`;

// okta puts the POST binding second too, and namespaces every element
const OKTA = `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://www.okta.com/exk1abcd">
<md:IDPSSODescriptor><md:KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data>
<ds:X509Certificate>MIIDpDCCAoygAwIBAgIGAV</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>
<md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://dev-123.okta.com/app/abc/sso/saml"/>
</md:IDPSSODescriptor></md:EntityDescriptor>`;

describe("parseIdpMetadata", () => {
  test("reads entityID, sso url and certificate from keycloak", () => {
    const m = parseIdpMetadata(KEYCLOAK);
    expect(m?.entityId).toBe("http://localhost:8180/realms/fhirfix");
    expect(m?.entryPoint).toBe("http://localhost:8180/realms/fhirfix/protocol/saml");
    // whitespace and newlines inside the base64 are stripped
    expect(m?.cert).toBe("MIICnTCCAYUCBgGftbGFdjANBgkq");
  });

  test("reads namespaced elements from okta", () => {
    const m = parseIdpMetadata(OKTA);
    expect(m?.entityId).toBe("http://www.okta.com/exk1abcd");
    expect(m?.entryPoint).toBe("https://dev-123.okta.com/app/abc/sso/saml");
    expect(m?.cert).toBe("MIIDpDCCAoygAwIBAgIGAV");
  });

  test("returns null when a required field is missing", () => {
    expect(parseIdpMetadata("<EntityDescriptor entityID='x'/>")).toBeNull();
    expect(parseIdpMetadata("")).toBeNull();
    expect(parseIdpMetadata("not xml at all")).toBeNull();
  });

  test("does not mistake the SP descriptor's ACS url for the IdP sso url", () => {
    const withAcs = KEYCLOAK.replace(
      "<IDPSSODescriptor",
      `<SPSSODescriptor><AssertionConsumerService Location="https://sp.example/acs"/></SPSSODescriptor><IDPSSODescriptor`,
    );
    expect(parseIdpMetadata(withAcs)?.entryPoint).toBe(
      "http://localhost:8180/realms/fhirfix/protocol/saml",
    );
  });
});

describe("certFingerprint", () => {
  test("is a colon-separated uppercase sha-256", async () => {
    const fp = await certFingerprint("MIICnTCCAYUCBgGf");
    expect(fp).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/);
  });

  test("differs for a different certificate", async () => {
    const a = await certFingerprint("MIICnTCCAYUCBgGf");
    const b = await certFingerprint("MIIDpDCCAoygAwIB");
    expect(a).not.toBe(b);
  });
});
