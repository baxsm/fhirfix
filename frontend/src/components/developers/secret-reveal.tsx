"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// a one-time secret display: the full value is shown once (on create/rotate) and
// never again. copy-to-clipboard with a confirmed state. used for api keys and
// webhook signing secrets.
export function SecretReveal({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard can fail on http origins or denied permission; the value is
      // still selectable in the field, so this is a soft failure.
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex items-stretch gap-2">
        <code className="min-w-0 flex-1 select-all break-all rounded-md border bg-muted/40 px-2.5 py-2 font-mono text-xs">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          className="shrink-0 self-stretch"
        >
          {copied ? <Check className="text-primary" /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
