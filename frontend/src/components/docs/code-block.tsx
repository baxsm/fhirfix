"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// a copyable code sample for the docs. quiet, dense, mono. not syntax-highlighted
// (no highlighter dep); the point is copy-paste-run accuracy, and to recede so the
// prose leads. reads calm in both themes (subtle muted panel, low-contrast text).
export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked on http origins; the code stays selectable.
    }
  };

  return (
    <div className={cn("overflow-hidden rounded-md border bg-muted/40", className)}>
      <div className="flex items-center justify-between px-2.5 py-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70">
          {label ?? "shell"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          {copied ? <Check className="size-2.5 text-success" /> : <Copy className="size-2.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-2.5 pb-2.5 font-mono text-[11px] leading-[1.7] text-foreground/80">
        <code>{code}</code>
      </pre>
    </div>
  );
}
