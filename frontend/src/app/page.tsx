import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PlaygroundPanel } from "@/components/marketing/playground-panel";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
        <BrandMark size="md" />
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/playground">Playground</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/docs">Docs</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_auto]">
          <div className="space-y-5">
            <p className="font-mono text-xs text-muted-foreground">
              US Core 6.1.0 · FHIR R4 · Da Vinci PAS / PDex
            </p>
            <h1 className="max-w-xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              A wall of FHIR conformance errors, turned into a ranked, fixable report.
            </h1>
            <p className="max-w-md text-balance text-muted-foreground">
              Validate against US Core, read plain-language findings, apply the safe deterministic
              fixes, and re-verify to clean. Billed per check.
            </p>
            <div className="flex gap-3">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Start free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/playground">Try the playground</Link>
              </Button>
            </div>
          </div>

          <ul className="hidden shrink-0 space-y-3 pt-8 font-mono text-xs text-muted-foreground lg:block">
            <li>detect format + version</li>
            <li>convert HL7v2 / C-CDA to FHIR</li>
            <li>validate against the profile</li>
            <li>derive + apply safe fixes</li>
            <li>re-verify to conformant</li>
          </ul>
        </div>

        <div className="mt-10">
          <PlaygroundPanel compact />
        </div>
      </main>

      <footer className="border-t px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <BrandMark size="sm" />
          <div className="flex gap-4">
            <Link href="/playground" className="hover:text-foreground">
              Playground
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
