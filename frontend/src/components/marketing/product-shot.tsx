import Image from "next/image";
import reportHero from "../../../public/report-hero.png";

export function ProductShot() {
  return (
    <section className="px-2 sm:px-4">
      <div className="mx-auto -mt-20 w-full max-w-[92rem] sm:-mt-28">
        <Image
          src={reportHero}
          alt="A FHIRfix report: 26 findings across 17 resources, ranked by severity, with the submitted HL7v2 beside the corrected FHIR and the conformance score moving from 845 to 852."
          priority
          sizes="(min-width: 1536px) 1472px, 100vw"
          className="rounded-xl shadow-2xl ring-1 ring-black/10"
        />
      </div>
    </section>
  );
}
