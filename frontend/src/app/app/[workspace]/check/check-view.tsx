"use client";

import { useMutation } from "@tanstack/react-query";
import { FlaskConical, Loader2, Play, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/dashboard/page-container";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useListOrganizations } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { SAMPLES } from "./samples";

const ACCEPT = ".json,.ndjson,.hl7,.txt,application/json,text/plain";
const MAX_BYTES = 5_000_000;
const EDITOR_PX = 340;

function describeInput(raw: string): string {
  const trimmed = raw.trimStart();
  if (!trimmed) return "Nothing to check yet";
  if (trimmed.startsWith("MSH|")) return "HL7v2 message";
  if (trimmed.startsWith("<")) return "FHIR XML";

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length > 1 && lines.every((l) => l.trim().startsWith("{"))) return "NDJSON";

  try {
    const parsed = JSON.parse(trimmed) as { resourceType?: string };
    if (parsed?.resourceType === "Bundle") return "FHIR Bundle";
    if (parsed?.resourceType) return `FHIR ${parsed.resourceType}`;
    return "JSON";
  } catch {
    return "Unrecognised format";
  }
}

export function CheckView({
  workspace,
  workspaceId: serverWorkspaceId,
}: {
  workspace: string;
  workspaceId?: string;
}) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = serverWorkspaceId || active?.id || "";

  const router = useRouter();
  const trpc = useTRPC();

  const [content, setContent] = useState("");
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const load = (next: string) => {
    setProblem(null);
    setContent(next);
    requestAnimationFrame(() => editorRef.current?.scrollTo({ top: 0 }));
  };

  const submit = useMutation(
    trpc.run.submit.mutationOptions({
      onSuccess: (res) => {
        router.push(`/app/${workspace}/runs/${res.runId}`);
      },
      onError: (e) => {
        if (e.message === "OUT_OF_CREDITS") {
          toast.error("You're out of credits. Add credits to run checks.", {
            action: {
              label: "Add credits",
              onClick: () => router.push(`/app/${workspace}/billing`),
            },
          });
          return;
        }
        toast.error(e.message ?? "Could not start the check.");
      },
    }),
  );

  const readFile = async (incoming: File) => {
    if (incoming.size > MAX_BYTES) {
      setProblem(`${incoming.name} is over 5 MB.`);
      return;
    }
    const text = await incoming.text();
    if (!text.trim()) {
      setProblem(`${incoming.name} is empty.`);
      return;
    }
    load(text);
  };

  const charCount = content.trim().length;
  const empty = charCount === 0;
  const busy = submit.isPending;

  const lineNumbers = Array.from(
    { length: Math.max(content.split("\n").length, 1) },
    (_, i) => i + 1,
  );

  return (
    <PageContainer width="full">
      <PageHeader
        title="New check"
        description="Converts, validates against US Core, auto-fixes what it safely can, then re-verifies."
      />

      {/* the whole card is the drop target, so a dragged file has an area the size of the panel */}
      {/** biome-ignore lint/a11y/noStaticElementInteractions: drag events on the
           shell; the focusable control inside is the textarea. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) void readFile(dropped);
        }}
        className={cn(
          "raised relative overflow-hidden rounded-lg border bg-card transition-colors",
          dragging && "border-interactive ring-1 ring-interactive/30",
        )}
      >
        <div className="flex items-center gap-2.5 border-b px-3 py-2">
          <span className="text-[13px] font-medium">Resource</span>
          <span className="min-w-0 truncate text-[0.75rem] text-muted-foreground">
            {describeInput(content)}
            {!empty && ` (${charCount.toLocaleString()} chars)`}
          </span>

          {/* getting content IN lives here; acting on it lives in the footer. */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) void readFile(picked);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => inputRef.current?.click()}
            >
              <Upload />
              Upload
            </Button>

            {/* a menu of actions, not a select. there is no chosen value to display afterwards - picking */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7">
                  <FlaskConical />
                  Load a sample
                </Button>
              </DropdownMenuTrigger>
              {/* wide enough that a sample label sits on one line - at max-w-xs the longest one wrapped */}
              <DropdownMenuContent align="end" className="w-[22rem]">
                {SAMPLES.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    className="flex-col items-start gap-0.5"
                    onSelect={() => load(s.content)}
                  >
                    <span className="flex w-full items-center gap-1.5 text-xs font-medium">
                      <span className="truncate">{s.label}</span>
                      <span className="ml-auto shrink-0 font-mono text-[0.75rem] text-muted-foreground">
                        {s.kind}
                      </span>
                    </span>
                    <span className="text-[0.6875rem] leading-snug text-muted-foreground">
                      {s.hint}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative flex" style={{ height: EDITOR_PX }}>
          {/* line-number gutter: findings cite resource paths, so it connects the report to the pasted text */}
          <div
            ref={gutterRef}
            aria-hidden
            style={{ lineHeight: "21px" }}
            className="shrink-0 select-none overflow-hidden border-r bg-muted/20 py-3.5 pr-2 pl-3 text-right font-mono text-xs text-muted-foreground/50 tabular-nums"
          >
            {lineNumbers.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>

          <Textarea
            ref={editorRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (problem) setProblem(null);
            }}
            onScroll={(e) => {
              if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
            }}
            onKeyDown={(e) => {
              if (e.key !== "Tab" || e.shiftKey) return;
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: s, selectionEnd: t } = el;
              const next = `${content.slice(0, s)}  ${content.slice(t)}`;
              setContent(next);
              requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
            }}
            spellCheck={false}
            aria-label="Resource content"
            style={{ lineHeight: "21px" }}
            className="h-full resize-none overflow-auto rounded-none border-0 bg-transparent py-3.5 pr-3.5 pl-3 font-mono text-xs shadow-none focus-visible:ring-0"
            placeholder="Paste FHIR JSON, a Bundle, or an HL7v2 message. You can also drop a file here."
          />
          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-interactive/5">
              <span className="rounded-md border border-interactive bg-background px-3 py-1.5 text-xs font-medium">
                Drop to load
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t bg-muted/30 px-3 py-2.5">
          {/* one reserved line: the profile fact normally, the file problem when there is one */}
          <span
            className={cn(
              "min-w-0 truncate text-[0.6875rem]",
              problem ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {problem ?? "Validated against US Core 6.1.0"}
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* clear is conditional on there being something to clear, so it is absent rather than disabled */}
            {!empty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setContent("");
                  setProblem(null);
                }}
              >
                Clear
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!workspaceId || empty || busy}
              onClick={() => {
                if (!workspaceId || !content.trim()) return;
                submit.mutate({ workspaceId, content, autoFix: true });
              }}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Play />}
              {busy ? "Starting..." : "Run check"}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
