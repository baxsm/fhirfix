import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="inline-block size-2.5 rounded-sm bg-primary" />
          FHIRfix
        </span>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          US Core 6.1.0 · FHIR R4 · Da Vinci PAS / PDex
        </p>
        <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn a wall of FHIR conformance errors into a ranked, fixable report.
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          Validate against US Core and Da Vinci profiles, read plain-language findings, apply the
          safe deterministic fixes, and re-verify to clean. Billed per check.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
