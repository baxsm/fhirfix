"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// the same quiet mono panel as CodeBlock, with a language switcher. the SDK
// sections show the same call in curl / node / python, and a reader wants their
// own language, not three stacked blocks.

export interface CodeTab {
  label: string;
  code: string;
}

export function CodeTabs({ tabs, className }: { tabs: CodeTab[]; className?: string }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = tabs[active] ?? tabs[0];

  const copy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked on http origins; the code stays selectable.
    }
  };

  if (!current) return null;

  return (
    <div className={cn("overflow-hidden rounded-md border bg-muted/40", className)}>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "cursor-pointer whitespace-nowrap font-mono text-[10px] uppercase tracking-wide transition-colors",
                index === active
                  ? "text-foreground"
                  : "text-muted-foreground/60 hover:text-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 cursor-pointer items-center gap-1 text-[10px] text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          {copied ? <Check className="size-2.5 text-primary" /> : <Copy className="size-2.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-2.5 pb-2.5 font-mono text-[11px] leading-[1.7] text-foreground/80">
        <code>{current.code}</code>
      </pre>
    </div>
  );
}
