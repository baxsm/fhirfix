import Link from "next/link";

// context-rich auth shell: a left brand/explainer panel + the form on the right.
// not a bare centered form on a gradient (ui.md).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between border-r bg-sidebar p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="inline-block size-2.5 rounded-sm bg-primary" />
          FHIRfix
        </Link>
        <div className="space-y-4">
          <h2 className="max-w-sm text-2xl font-semibold tracking-tight">
            Turn a wall of FHIR conformance errors into a ranked, fixable report.
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Validate against US Core and Da Vinci profiles, get plain-language findings, apply the
            safe deterministic fixes, and re-verify to clean. Billed per check, no subscription.
          </p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          US Core 6.1.0 · FHIR R4 · Da Vinci PAS / PDex
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 flex items-center gap-2 font-mono text-sm font-semibold lg:hidden"
          >
            <span className="inline-block size-2.5 rounded-sm bg-primary" />
            FHIRfix
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
