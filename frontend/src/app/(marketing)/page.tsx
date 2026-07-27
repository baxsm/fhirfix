import { ComplianceSection } from "@/components/marketing/compliance-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { LiveProof } from "@/components/marketing/live-proof";
import { PipelineSection } from "@/components/marketing/pipeline-section";
import { ReportPreview } from "@/components/marketing/report-preview";
import { ScaleCards } from "@/components/marketing/scale-cards";
import { StandardsBar } from "@/components/marketing/standards-bar";
import { site, siteUrl } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: site.name,
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "Healthcare interoperability",
  operatingSystem: "Web",
  url: siteUrl,
  description: site.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier, then billed per check.",
  },
  publisher: {
    "@type": "Organization",
    name: site.name,
    url: siteUrl,
  },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <StandardsBar />
      <LiveProof />
      <PipelineSection />
      <ReportPreview />
      <ScaleCards />
      <ComplianceSection />
      <FinalCta />
    </>
  );
}
