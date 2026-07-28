"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTRPC } from "@/trpc/client";
import { type ExportRow, type ParseResult, parseCsv, toCsv, toJson } from "./mapping-csv";

function download(filename: string, body: string, mime: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ImportExportDialog({
  workspaceId,
  open,
  onOpenChange,
  onImported,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [filename, setFilename] = useState("");
  const [exporting, setExporting] = useState(false);

  const reset = () => {
    setParsed(null);
    setFilename("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const runExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const rows = (await queryClient.fetchQuery(
        trpc.mappings.exportRows.queryOptions({ workspaceId }),
      )) as ExportRow[];
      if (rows.length === 0) {
        toast.error("There are no active mappings to export.");
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        download(`mappings-${stamp}.csv`, toCsv(rows), "text/csv");
      } else {
        download(`mappings-${stamp}.json`, toJson(rows), "application/json");
      }
      toast.success(`Exported ${rows.length} mapping${rows.length === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Could not export the mappings. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const importRows = useMutation(
    trpc.mappings.importRows.mutationOptions({
      onSuccess: (res: { imported: number; skipped: string[] }) => {
        const { imported, skipped } = res;
        if (imported === 0) {
          toast.error("Nothing was imported. Every row already exists.");
        } else if (skipped.length > 0) {
          toast.success(`Imported ${imported}. Skipped ${skipped.length} that already existed.`);
        } else {
          toast.success(`Imported ${imported} mapping${imported === 1 ? "" : "s"}.`);
        }
        reset();
        onOpenChange(false);
        onImported();
      },
      onError: (e) => toast.error(e.message ?? "Could not import the file."),
    }),
  );

  const onPick = async (file: File) => {
    setFilename(file.name);
    const text = await file.text();
    if (file.name.endsWith(".json")) {
      try {
        const raw: unknown = JSON.parse(text);
        if (!Array.isArray(raw)) throw new Error("not an array");
        setParsed(parseCsv(toCsv(raw as ExportRow[])));
      } catch {
        setParsed({ rows: [], errors: [{ line: 1, reason: "this is not a valid JSON array" }] });
      }
      return;
    }
    setParsed(parseCsv(text));
  };

  const rows = parsed?.rows ?? [];
  const errors = parsed?.errors ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import or export mappings</DialogTitle>
          <DialogDescription>
            An export contains the active mappings in this workspace. The same file imports into
            another workspace unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="font-medium text-xs">Export active mappings</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={() => runExport("csv")}
              >
                <Download />
                {exporting ? "Preparing..." : "CSV"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={() => runExport("json")}
              >
                <Download />
                JSON
              </Button>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="font-medium text-xs">Import from a file</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onPick(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
              Choose a CSV or JSON file
            </Button>
            {filename && (
              <p className="truncate text-muted-foreground text-xs">
                {filename}
                {parsed && ` - ${rows.length} row${rows.length === 1 ? "" : "s"} ready`}
              </p>
            )}

            {/* the file is not rejected outright for a few bad rows */}
            {errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md border border-destructive/20 bg-destructive/[0.03] p-2">
                <p className="font-medium text-xs">
                  {errors.length} row{errors.length === 1 ? "" : "s"} cannot be imported
                </p>
                <ul className="mt-1 space-y-0.5">
                  {errors.slice(0, 20).map((e) => (
                    <li key={`${e.line}-${e.reason}`} className="text-muted-foreground text-xs">
                      Line {e.line}: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={rows.length === 0 || importRows.isPending}
            onClick={() => importRows.mutate({ workspaceId, rows })}
          >
            {importRows.isPending
              ? "Importing..."
              : rows.length === 0
                ? "Import"
                : `Import ${rows.length} mapping${rows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
