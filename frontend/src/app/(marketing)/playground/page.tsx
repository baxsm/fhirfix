import Link from "next/link";
import { PlaygroundPanel } from "@/components/marketing/playground-panel";

export const metadata = {
  title: "Playground",
};

// chrome (header/footer/light-lock) comes from src/app/(marketing)/layout.tsx.
export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-12 sm:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Paste a FHIR resource or an HL7v2 message and run it through the real engine. Same
          deterministic pipeline the product uses, capped for demo volume. Identifiers in the
          corrected output are redacted.
        </p>
      </div>

      <PlaygroundPanel />

      <p className="text-xs text-muted-foreground">
        Want history, batch uploads, the mapping registry, and the API?{" "}
        <Link href="/sign-up" className="text-interactive hover:underline">
          Create a workspace
        </Link>
        .
      </p>
    </div>
  );
}
