import { logger } from "./logger";

export type IdpMetadata = {
  entityId: string;
  entryPoint: string;
  cert: string;
};

// every SAML IdP publishes the same three facts in its descriptor. extracted by
// pattern rather than a full XML parse: fast-xml-parser is only present here as
// a transitive dep of the sso plugin, and taking a direct dependency on someone
// else's transitive tree breaks the moment they swap parsers.
export function parseIdpMetadata(xml: string): IdpMetadata | null {
  const entityId = xml.match(/entityID="([^"]+)"/)?.[1];

  // prefer the HTTP-POST binding: that is the one we send users through. an IdP
  // usually lists Redirect first, so taking the first match would pick wrong.
  const post = xml.match(
    /<[^>]*SingleSignOnService[^>]*HTTP-POST[^>]*Location="([^"]+)"|<[^>]*SingleSignOnService[^>]*Location="([^"]+)"[^>]*HTTP-POST/,
  );
  const anyBinding = xml.match(/<[^>]*SingleSignOnService[^>]*Location="([^"]+)"/);
  const entryPoint = post?.[1] ?? post?.[2] ?? anyBinding?.[1];

  // the signing certificate. whitespace inside the base64 is decorative.
  const cert = xml
    .match(/<[^>]*X509Certificate[^>]*>([\s\S]*?)<\/[^>]*X509Certificate>/)?.[1]
    ?.replace(/\s/g, "");

  if (!entityId || !entryPoint || !cert) {
    logger.error(
      "saml.parseMetadata",
      `missing ${[!entityId && "entityID", !entryPoint && "SSO url", !cert && "certificate"]
        .filter(Boolean)
        .join(", ")}`,
    );
    return null;
  }

  return { entityId, entryPoint, cert };
}

// the fingerprint an admin can compare against what their IdP shows, without us
// ever displaying the full certificate back to them.
export async function certFingerprint(cert: string): Promise<string> {
  const der = Uint8Array.from(atob(cert), (c) => c.charCodeAt(0));
  const hash = await crypto.subtle.digest("SHA-256", der);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(":")
    .toUpperCase();
}
