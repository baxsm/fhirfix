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
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="max-w-md text-2xl font-semibold tracking-tight">
              Turn a wall of FHIR conformance errors into a ranked, fixable report.
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Validate against US Core and Da Vinci profiles, get plain-language findings, apply the
              safe deterministic fixes, and re-verify to clean.
            </p>
          </div>

          {/* the product's promise in its own material: a non-conformant field
              (red) becomes conformant (emerald). real output, not stock art. */}
          <div className="max-w-md overflow-hidden rounded-lg border bg-card font-mono text-xs">
            <div className="flex items-center gap-2 border-b px-3 py-2 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-destructive" />
              Patient.identifier[0].system
              <span className="ml-auto rounded border border-destructive/30 px-1.5 py-0.5 text-[10px] text-destructive">
                error
              </span>
            </div>
            <div className="space-y-1 px-3 py-2.5">
              <div className="flex gap-2 text-destructive/90">
                <span className="select-none text-muted-foreground/50">-</span>
                <span>"system": "MRN"</span>
              </div>
              <div className="flex gap-2 text-primary">
                <span className="select-none text-muted-foreground/50">+</span>
                <span>"system": "http://hospital.example.org/mrn"</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 border-t px-3 py-2 text-[11px] text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              conformant · re-verified
            </div>
          </div>
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
