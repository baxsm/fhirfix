import { env } from "@/lib/env";

export const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const site = {
  name: "FHIRfix",
  title: "FHIRfix — Turn FHIR conformance errors into a fixable report",
  description:
    "Validate FHIR and HL7v2 against US Core, get a ranked plain-language remediation report, apply the safe deterministic fixes, and re-verify to clean. Billed per check.",
  url: siteUrl,
} as const;
