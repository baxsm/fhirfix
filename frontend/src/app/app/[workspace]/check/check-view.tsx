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

  const [content, setContent] = useState(SAMPLES[0]?.content ?? "");
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<StagedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useMutation(
    trpc.run.submit.mutationOptions({
      onSuccess: (res) => {
        // route straight to the report, which shows the in-progress state and
        // swaps to the finished report when the worker completes.
        router.push(`/app/${workspace}/runs/${res.runId}`);
      },
      onError: (e) => toast.error(e.message ?? "Could not start the check."),
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
    // load the first ready file into the editor so the user sees what runs.
    const firstReady = staged.find((f) => f.status === "ready");
    if (firstReady) setContent(firstReady.content);
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">New check</h1>
        <p className="text-sm text-muted-foreground">
          Paste or drop a FHIR resource, a bundle, or an HL7v2 message. The engine converts,
          validates against US Core, auto-fixes what it safely can, and re-verifies.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setContent(s.content);
              setFiles([]);
            }}
            className="cursor-pointer rounded-md border bg-card px-3 py-1.5 text-left text-xs raised hover:border-foreground/25"
          >
            <span className="font-medium">{s.label}</span>
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">{s.kind}</span>
          </button>
        ))}
      </div>

      {/* drop zone wraps the editor so a drop anywhere over it stages files. */}
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
          "flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-3 text-xs text-muted-foreground transition-colors",
          dragging
            ? "border-interactive bg-interactive/5 text-interactive"
            : "hover:border-foreground/25",
        )}
      >
        <Upload className="size-3.5" />
        Drop a file here, or click to browse (.json, .ndjson, .hl7)
      </button>
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

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, idx) => (
            <li
              key={`${f.name}-${idx}`}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-xs raised",
                f.status === "rejected" ? "border-red-500/30 bg-red-500/5" : "bg-card",
              )}
            >
              <FileUp
                className={cn(
                  "size-3.5 shrink-0",
                  f.status === "rejected" ? "text-red-400" : "text-muted-foreground",
                )}
              />
              <span className="min-w-0 flex-1 truncate font-mono">{f.name}</span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {(f.size / 1024).toFixed(1)} KB
              </span>
              {f.status === "rejected" ? (
                <span className="text-[10px] text-red-400">{f.reason}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setContent(f.content)}
                  className="cursor-pointer text-[10px] text-interactive hover:underline"
                >
                  Load
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        className="min-h-[240px] font-mono text-xs"
        placeholder="Paste a FHIR resource, a bundle, or an HL7v2 message..."
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={!workspaceId || !content.trim() || submit.isPending}
          onClick={run}
        >
          {submit.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Run check
        </Button>
        <span className="text-xs text-muted-foreground">
          Validated against US Core 6.1.0. Fixes are re-verified before you see them.
        </span>
      </div>
    </div>
  );
}
