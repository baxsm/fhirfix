import { Construction } from "lucide-react";

// honest placeholder for routes whose feature lands in a later phase.
// not fake data, not a dead end (writing.md product-honesty).
export function PhasePlaceholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-md border">
          <Construction className="size-5 text-muted-foreground" />
        </span>
        <p className="text-sm font-medium">Coming in {phase}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This part of the workspace is not built yet. The foundation, auth, and shell are in place.
        </p>
      </div>
    </div>
  );
}
