import { logger } from "./logger";

export type IdpMetadata = {
  entityId: string;
  entryPoint: string;
  cert: string;
};

// pattern-matched, not parsed: fast-xml-parser is the sso plugin's transitive dep, not ours
export function parseIdpMetadata(xml: string): IdpMetadata | null {
  const entityId = xml.match(/entityID="([^"]+)"/)?.[1];

  // must prefer HTTP-POST; an IdP usually lists Redirect first so the first match is wrong
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

// what an admin compares against their IdP, so the full certificate is never shown back
export async function certFingerprint(cert: string): Promise<string> {
  const der = Uint8Array.from(atob(cert), (c) => c.charCodeAt(0));
  const hash = await crypto.subtle.digest("SHA-256", der);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(":")
    .toUpperCase();
}
