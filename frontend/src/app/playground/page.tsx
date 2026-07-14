import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PlaygroundPanel } from "@/components/marketing/playground-panel";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Playground · FHIRfix",
};

export default function PlaygroundPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
        <Link href="/">
          <BrandMark size="md" />
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-12">
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
      </main>
    </div>
  );
}
