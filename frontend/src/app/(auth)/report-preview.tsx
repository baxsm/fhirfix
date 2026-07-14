import { FileScan } from "lucide-react";

// TODO(phase-2 report): once the real remediation report component exists
// (docs/ui.md "core screen"), render a genuine static slice of it here — a real
// findings list from a fixture run, not hand-authored HTML. until then this is
// an honest placeholder, NOT faked report data dressed up as real output
// (writing.md product-honesty). do not reintroduce hardcoded findings/counts.
export function ReportPreview() {
  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
        <span className="flex size-9 items-center justify-center rounded-md border bg-card">
          <FileScan className="size-4 text-muted-foreground" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">The remediation report lives here</p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Ranked, plain-language findings with one-click safe fixes. A live preview drops in once
            the report screen is built.
          </p>
        </div>
      </div>
    </div>
  );
}
