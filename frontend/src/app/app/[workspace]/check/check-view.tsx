"use client";

import { useMutation } from "@tanstack/react-query";
import { FileUp, Loader2, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useListOrganizations } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { SAMPLES } from "./samples";

const ACCEPT = ".json,.ndjson,.hl7,.txt,application/json,text/plain";
const MAX_BYTES = 5_000_000;

// ONE editor height, empty or full. the page used to grow the panel from 44px to
// whatever the content measured: clicking a sample jumped the panel 200 -> 613px
// in a single frame while both sample cards unmounted, which is a third of the
// viewport moving under the pointer. a fixed frame makes that impossible rather
// than merely animating it.
const EDITOR_PX = 320;

/**
 * this page asks ONE question: what do you want checked? it used to answer that
 * with a Paste/Upload tab pair, which was two ways of filling the same box
 * presented as two different destinations. a textarea already accepts a dropped
 * file, so the tabs were dividing something that was never actually divided -
 * and the filled-black tab treatment made a mode switch look like the loudest
 * control on the page.
 *
 * it also opened with a sample already pasted in and "478 characters ready"
 * underneath, describing text the user never typed. that made the primary button
 * permanently enabled and the empty state unreachable, so nobody ever saw what a
 * new user sees. samples are now an offer, not a default.
 *
 * the layout holds ONE shape from first paint: fixed-height editor, a permanent
 * sample row, then the action bar. every control that exists is always on screen,
 * so choosing a source cannot move anything. the previous version swapped the
 * samples out for the editor's own growth and the panel jumped 413px in a frame.
 */

interface StagedFile {
  name: string;
  size: number;
  status: "ready" | "rejected";
  reason?: string;
}

// a label for what the engine will treat this as. deliberately the same first
// checks engine/src/detect.ts makes (MSH| -> v2, < -> xml, multi-line { -> ndjson,
// resourceType Bundle -> bundle) so the footer never claims a format the engine
// then disagrees with. it is a label, not a parser - the engine still decides.
function describeInput(raw: string): string {
  const trimmed = raw.trimStart();
  if (!trimmed) return "";
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

export function CheckView({ workspace }: { workspace: string }) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

  const router = useRouter();
  const trpc = useTRPC();

  const [content, setContent] = useState("");
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<StagedFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

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
      setFile({
        name: incoming.name,
        size: incoming.size,
        status: "rejected",
        reason: "Over 5 MB",
      });
      return;
    }
    const text = await incoming.text();
    if (!text.trim()) {
      setFile({
        name: incoming.name,
        size: incoming.size,
        status: "rejected",
        reason: "Empty file",
      });
      return;
    }
    setFile({ name: incoming.name, size: incoming.size, status: "ready" });
    setContent(text);
    setSampleId(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) void readFile(dropped);
  };

  const clear = () => {
    setContent("");
    setFile(null);
    setSampleId(null);
  };

  const run = () => {
    if (!workspaceId || !content.trim()) return;
    submit.mutate({ workspaceId, content, autoFix: true });
  };

  const charCount = content.trim().length;
  const empty = charCount === 0;
  const detected = describeInput(content);

  return (
    <PageContainer>
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">New check</h1>
        {/* what happens to the input, not what the input can be - the placeholder
            and the sample chips already answer that, and saying it three times
            was most of what made this page read as filler. */}
        <p className="text-sm text-muted-foreground">
          Converts, validates against US Core, auto-fixes what it safely can, then re-verifies.
        </p>
      </header>

      {/* one surface. the whole thing is the drop target, so a dragged file has a
          target the size of the editor instead of a separate tab. */}
      {/** biome-ignore lint/a11y/noStaticElementInteractions: drag events on the
           editor shell; the focusable control inside is the textarea. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          // only clear when the pointer actually leaves the shell, not when it
          // crosses onto a child element.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "raised relative overflow-hidden rounded-lg border bg-card transition-colors",
          dragging && "border-interactive ring-1 ring-interactive/30",
        )}
      >
        <div className="relative overflow-hidden">
          <Textarea
            ref={editorRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setSampleId(null);
              if (file) setFile(null);
            }}
            spellCheck={false}
            aria-label="Resource content"
            style={{ height: EDITOR_PX }}
            className="resize-none overflow-auto rounded-none border-0 bg-transparent p-4 font-mono text-xs shadow-none focus-visible:ring-0"
            // short, because the dropzone and the sample chips are visible
            // controls directly below. the old placeholder narrated all three
            // options in one mono run-on sentence inside the input.
            placeholder="Paste FHIR JSON, a Bundle, or an HL7v2 message"
          />

          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-interactive/5">
              <span className="rounded-md border border-interactive bg-background px-3 py-1.5 text-xs font-medium">
                Drop to load the file
              </span>
            </div>
          )}
        </div>

        {/* the sample row is PERMANENT. it used to render only while the editor
            was empty, so clicking a sample unmounted the thing you just clicked
            and the panel resized under the pointer. now it stays put and the
            selected one is marked, which also makes it obvious how to swap
            between them or get back to a blank editor. */}
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
          <span className="text-[11px] text-muted-foreground">Start from</span>
          {SAMPLES.map((s) => {
            const selected = sampleId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                title={s.hint}
                aria-pressed={selected}
                onClick={() => {
                  if (selected) {
                    clear();
                    return;
                  }
                  setContent(s.content);
                  setSampleId(s.id);
                  setFile(null);
                }}
                className={cn(
                  "press cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors",
                  selected
                    ? "border-foreground/25 bg-muted font-medium"
                    : "bg-background hover:border-foreground/25 hover:bg-muted/50",
                )}
              >
                {s.label}
                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{s.kind}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
            {file ? (
              <>
                <FileUp
                  className={cn(
                    "size-3.5 shrink-0",
                    file.status === "rejected" ? "text-destructive" : "text-muted-foreground",
                  )}
                />
                <span className="truncate font-mono">{file.name}</span>
                {file.status === "rejected" ? (
                  <span className="shrink-0 text-destructive">{file.reason}</span>
                ) : (
                  <span className="shrink-0 font-mono tabular-nums">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={clear}
                  className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              // what the engine will treat this as, not just how long it is. a
              // character count tells you nothing you can act on; the detected
              // format is the one thing worth confirming before you spend a run.
              <span className="font-mono">
                {empty ? (
                  "Nothing to check yet"
                ) : (
                  <>
                    {detected}
                    <span className="text-muted-foreground/70">
                      {" · "}
                      {charCount.toLocaleString()} chars
                    </span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
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
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Choose file
            </Button>
            {!empty && (
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                Clear
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!workspaceId || empty || submit.isPending}
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
      </div>

      <p className="text-xs text-muted-foreground">
        Validated against US Core 6.1.0. Every fix is re-verified before you see it.
      </p>
    </PageContainer>
  );
}
