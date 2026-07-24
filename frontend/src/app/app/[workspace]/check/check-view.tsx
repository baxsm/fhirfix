"use client";

import { useMutation } from "@tanstack/react-query";
import { FileUp, Loader2, Play, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useListOrganizations } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { SAMPLES } from "./samples";

const ACCEPT = ".json,.ndjson,.hl7,.txt,application/json,text/plain";
const MAX_BYTES = 5_000_000;

type Mode = "paste" | "upload";

interface StagedFile {
  name: string;
  size: number;
  content: string;
  status: "ready" | "rejected";
  reason?: string;
}

export function CheckView({ workspace }: { workspace: string }) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

  const router = useRouter();
  const trpc = useTRPC();

  // paste and upload are two ways to answer the same question, so they are one
  // control with one panel. before, a squashed drop strip sat permanently above
  // a tall textarea and neither looked like the primary path.
  const [mode, setMode] = useState<Mode>("paste");
  const [content, setContent] = useState(SAMPLES[0]?.content ?? "");
  const [sampleId, setSampleId] = useState<string | null>(SAMPLES[0]?.id ?? null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<StagedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const readFiles = async (list: FileList | File[]) => {
    const staged: StagedFile[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_BYTES) {
        staged.push({
          name: file.name,
          size: file.size,
          content: "",
          status: "rejected",
          reason: "Over 5 MB",
        });
        continue;
      }
      const text = await file.text();
      const looksValid = /\.(json|ndjson|hl7|txt)$/i.test(file.name) || text.trim().length > 0;
      staged.push({
        name: file.name,
        size: file.size,
        content: text,
        status: looksValid ? "ready" : "rejected",
        reason: looksValid ? undefined : "Unrecognized format",
      });
    }
    setFiles((prev) => [...prev, ...staged]);
    const firstReady = staged.find((f) => f.status === "ready");
    if (firstReady) {
      setContent(firstReady.content);
      setSampleId(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) void readFiles(e.dataTransfer.files);
  };

  const run = () => {
    if (!workspaceId || !content.trim()) return;
    submit.mutate({ workspaceId, content, autoFix: true });
  };

  const charCount = content.trim().length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">New check</h1>
        <p className="text-sm text-muted-foreground">
          Give the engine a FHIR resource, a bundle, or an HL7v2 message. It converts, validates
          against US Core, auto-fixes what it safely can, then re-verifies.
        </p>
      </header>

      <div className="raised overflow-hidden rounded-lg border bg-card">
        {/* mode switch sits ON the panel it controls, so it is obvious which
            surface it is switching. */}
        <div
          role="tablist"
          aria-label="Input method"
          className="flex items-center gap-1 border-b bg-muted/30 p-1.5"
        >
          <ModeTab
            active={mode === "paste"}
            onClick={() => setMode("paste")}
            label="Paste"
            hint="Type or paste the record"
          />
          <ModeTab
            active={mode === "upload"}
            onClick={() => setMode("upload")}
            label="Upload"
            hint="Drop a .json, .ndjson or .hl7 file"
          />
        </div>

        {/* a FIXED height, not a min-height. the textarea grows with its content,
            so a min-height alone let the paste panel outgrow the upload panel and
            the switch moved the Run button by ~320px. both modes now occupy the
            same box and scroll internally. */}
        <div className="h-[360px] overflow-hidden p-4">
          {mode === "paste" ? (
            <div className="flex h-full flex-col gap-3">
              <Textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setSampleId(null);
                }}
                spellCheck={false}
                aria-label="Resource content"
                className="min-h-0 flex-1 resize-none overflow-auto border-0 bg-transparent p-0 font-mono text-xs shadow-none focus-visible:ring-0"
                placeholder="Paste a FHIR resource, a bundle, or an HL7v2 message..."
              />
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-t pt-3">
                <span className="text-[11px] text-muted-foreground">Start from a sample</span>
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    // the selected sample was previously indistinguishable from
                    // the unselected one, so the panel showed content nothing
                    // on screen claimed responsibility for.
                    aria-pressed={sampleId === s.id}
                    onClick={() => {
                      setContent(s.content);
                      setSampleId(s.id);
                      setFiles([]);
                    }}
                    className={cn(
                      "press cursor-pointer rounded-md border px-2 py-1 text-[11px]",
                      sampleId === s.id
                        ? "border-interactive/40 bg-interactive/5 text-interactive"
                        : "text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    {s.label}
                    <span className="ml-1.5 font-mono opacity-60">{s.kind}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-3">
              <button
                type="button"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex min-h-0 w-full flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed transition-colors",
                  dragging
                    ? "border-interactive bg-interactive/5"
                    : "hover:border-foreground/25 hover:bg-muted/30",
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                  <Upload
                    className={cn(
                      "size-4",
                      dragging ? "text-interactive" : "text-muted-foreground",
                    )}
                  />
                </span>
                <span className="text-sm font-medium">
                  {dragging ? "Drop to stage the file" : "Drop a file, or click to browse"}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  .json · .ndjson · .hl7 · up to 5 MB
                </span>
              </button>

              {files.length > 0 && (
                <ul className="max-h-24 shrink-0 space-y-1.5 overflow-y-auto border-t pt-3">
                  {files.map((f, idx) => (
                    <li
                      key={`${f.name}-${idx}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
                        f.status === "rejected"
                          ? "border-destructive/30 bg-destructive/5"
                          : "bg-background",
                      )}
                    >
                      <FileUp
                        className={cn(
                          "size-3.5 shrink-0",
                          f.status === "rejected" ? "text-destructive" : "text-muted-foreground",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate font-mono">{f.name}</span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                      {f.status === "rejected" ? (
                        <span className="shrink-0 text-[10px] text-destructive">{f.reason}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setContent(f.content);
                            setMode("paste");
                          }}
                          className="shrink-0 cursor-pointer text-[10px] text-interactive hover:underline"
                        >
                          Review
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${f.name}`}
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* the action bar is part of the panel, not floating below it, so the
            thing you press belongs to the thing you filled in. */}
        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3">
          {/* in upload mode the staged content came from the other tab, so say
              where it is. "478 characters ready" next to an empty drop zone
              reads like a bug. */}
          <span className="font-mono text-[11px] text-muted-foreground">
            {charCount === 0
              ? "Nothing to check yet"
              : mode === "upload"
                ? `${charCount.toLocaleString()} characters staged in Paste`
                : `${charCount.toLocaleString()} characters ready`}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={!workspaceId || !content.trim() || submit.isPending}
            onClick={run}
          >
            {submit.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {submit.isPending ? "Starting..." : "Run check"}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void readFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="text-xs text-muted-foreground">
        Validated against US Core 6.1.0. Every fix is re-verified before you see it.
      </p>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "press flex-1 cursor-pointer rounded-md px-3 py-1.5 text-left",
        active ? "raised bg-card" : "hover:bg-card/60",
      )}
    >
      <span
        className={cn(
          "block text-xs font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span className="block text-[11px] text-muted-foreground/80">{hint}</span>
    </button>
  );
}
