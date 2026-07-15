import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service · FHIRfix",
};

// TODO(gap: legal content): placeholder page. real Terms of Service copy is not
// written yet and must be added before launch (owned by phase 8, launch
// readiness - see docs/phases/phase-8.md). the route exists so the auth-panel
// and footer links resolve instead of 404ing. do NOT ship fake legal text here.
export default function TermsPage() {
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The Terms of Service are being finalized and will be published here before general
          availability.
        </p>
      </main>
    </div>
  );
}
