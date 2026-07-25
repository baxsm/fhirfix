"use client";

import { useMutation } from "@tanstack/react-query";
import { FileUp, Loader2, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
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
// with content, never shorter than this - a few lines of json.
const MIN_EDITOR_PX = 220;
// empty, the editor is only the prompt; the sample offer sits below it in flow.
const EMPTY_EDITOR_PX = 44;

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
 */

interface StagedFile {
  name: string;
  size: number;
  status: "ready" | "rejected";
  reason?: string;
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

  // grow to the content, up to a viewport-relative cap, then scroll inside.
  // measured from scrollHeight after resetting to auto, so deleting shrinks it
  // back rather than keeping the tallest height it ever reached.
  // when empty the editor is just the prompt line - the sample offer below it
  // carries the rest of the panel's height, so there is no dead space to fill.
  const [editorHeight, setEditorHeight] = useState<number>(EMPTY_EDITOR_PX);
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (!content.trim()) {
      setEditorHeight(EMPTY_EDITOR_PX);
      return;
    }
    const cap = Math.max(MIN_EDITOR_PX, window.innerHeight - 330);
    el.style.height = "auto";
    setEditorHeight(Math.min(cap, Math.max(MIN_EDITOR_PX, el.scrollHeight)));
  }, [content]);

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
      setFile({ name: incoming.name, size: incoming.size, status: "rejected", reason: "Empty file" });
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

  return (
    <PageContainer>
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">New check</h1>
        <p className="text-sm text-muted-foreground">
          Give the engine a FHIR resource, a bundle, or an HL7v2 message. It converts, validates
          against US Core, auto-fixes what it safely can, then re-verifies.
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
        {/* the old fixed 560px existed to stop the Paste/Upload switch moving the
            Run button by ~320px. with no switch there is nothing to hold still,
            and a fixed height left 451px of dead panel under the sample offer
            (measured). so it starts compact and grows with what you paste, up to
            a viewport-relative cap after which the textarea scrolls. */}
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
            style={{ height: editorHeight }}
            className="resize-none overflow-auto rounded-none border-0 bg-transparent p-4 font-mono text-xs shadow-none focus-visible:ring-0"
            placeholder="Paste a FHIR resource, a bundle, or an HL7v2 message. You can also drop a file anywhere on this panel, or start from a sample:"
          />

          {/* samples are a way to START, offered when there is nothing to check,
              rather than a default that fills the box on your behalf. each says
              what is wrong with it, because the point of a sample is to have real
              defects to find.
              they sit directly under the placeholder, NOT pinned to the bottom of
              the panel: anchored to the bottom they left a ~340px void between
              the prompt and the only thing you could act on. the offer belongs
              where the eye already is. */}
          {empty && (
            // in normal flow, NOT an absolute overlay: positioned absolutely it
            // contributed no height, so the panel sized itself to the textarea
            // alone and the footer sliced the cards in half.
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setContent(s.content);
                      setSampleId(s.id);
                      setFile(null);
                    }}
                    className="press max-w-sm cursor-pointer rounded-md border bg-background px-2.5 py-1.5 text-left transition-colors hover:border-foreground/25 hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      {s.label}
                      <span className="font-mono text-[10px] text-muted-foreground">{s.kind}</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-interactive/5">
              <span className="rounded-md border border-interactive bg-background px-3 py-1.5 text-xs font-medium">
                Drop to load the file
              </span>
            </div>
          )}
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
              <span className="font-mono">
                {empty ? (
                  "Nothing to check yet"
                ) : (
                  <>
                    {charCount.toLocaleString()} characters
                    {sampleId && " · sample"}
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
            <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
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
