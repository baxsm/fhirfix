"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { fmtDateTime } from "./shared";

interface LogRow {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  requestBytes: number | null;
  responseBytes: number | null;
  idempotencyKey: string | null;
  runId: string | null;
  apiKeyId: string | null;
  errorCode: string | null;
  ip: string | null;
  createdAt: string | Date;
}

const METHODS = ["ALL", "POST", "GET"] as const;

export function statusTone(code: number): string {
  if (code >= 500) return "border-red-500/30 bg-red-500/10 text-red-400";
  if (code >= 400) return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  if (code >= 300) return "border-sky-500/30 bg-sky-500/10 text-sky-400";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
}

export function RequestLogsSection({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();

  const [method, setMethod] = useState<(typeof METHODS)[number]>("ALL");
  const [onlyErrors, setOnlyErrors] = useState(false);
  // accumulated pages, keyed off the active filters. reset when filters change.
  const [rows, setRows] = useState<LogRow[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({
    ...trpc.developers.requestLogs.list.queryOptions({
      workspaceId,
      method: method === "ALL" ? undefined : method,
      onlyErrors: onlyErrors || undefined,
      cursor,
      limit: 25,
    }),
    enabled: !!workspaceId,
  });

  // fold each fetched page into the accumulated list. a page with an undefined
  // cursor is the first page of a new filter set, so it replaces rather than
  // appends.
  useEffect(() => {
    if (!query.data) return;
    const page = query.data.logs as LogRow[];
    setRows((prev) => (cursor ? [...prev, ...page] : page));
  }, [query.data, cursor]);

  // changing a filter resets pagination back to the first page.
  const changeFilter = (fn: () => void) => {
    fn();
    setCursor(undefined);
    setRows([]);
    setExpanded(null);
  };

  const hasMore = query.data?.hasMore ?? false;
  const nextCursor = query.data?.nextCursor ?? undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border p-0.5">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => changeFilter(() => setMethod(m))}
              className={cn(
                "cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors",
                method === m
                  ? "bg-foreground/[0.07] text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyErrors}
            onChange={(e) => changeFilter(() => setOnlyErrors(e.target.checked))}
            className="size-3.5 rounded border-input accent-[var(--interactive)]"
          />
          Errors only
        </label>
      </div>

      {query.isPending && rows.length === 0 ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError && rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm text-muted-foreground">Could not load request logs.</p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyLogs onlyErrors={onlyErrors} />
      ) : (
        <>
          <div className="-mx-5">
            <Table>
              <TableBody>
                {rows.map((r) => (
                  <LogEntry
                    key={r.id}
                    row={r}
                    open={expanded === r.id}
                    onToggle={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={query.isFetching}
                onClick={() => setCursor(nextCursor)}
              >
                {query.isFetching ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LogEntry({ row, open, onToggle }: { row: LogRow; open: boolean; onToggle: () => void }) {
  return (
    <>
      <TableRow
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="cursor-pointer"
      >
        <TableCell className="w-8 pl-5">
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </TableCell>
        <TableCell className="pr-3">
          <span className="font-mono text-xs font-medium">{row.method}</span>
        </TableCell>
        <TableCell className="pr-3">
          <span
            className={cn(
              "inline-flex h-5 items-center rounded border px-1.5 font-mono text-[11px] tabular-nums",
              statusTone(row.statusCode),
            )}
          >
            {row.statusCode}
          </span>
        </TableCell>
        <TableCell className="min-w-0 pr-3">
          <span className="font-mono text-xs text-muted-foreground">{row.path}</span>
        </TableCell>
        <TableCell className="pr-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {row.latencyMs}ms
        </TableCell>
        <TableCell className="pr-5 text-right text-xs whitespace-nowrap text-muted-foreground">
          {fmtDateTime(row.createdAt)}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={6} className="px-5 py-3 whitespace-normal">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              <Detail label="Request ID" value={row.id} mono />
              <Detail label="Error code" value={row.errorCode ?? "—"} mono={!!row.errorCode} />
              <Detail label="Run ID" value={row.runId ?? "—"} mono={!!row.runId} />
              <Detail
                label="Idempotency key"
                value={row.idempotencyKey ?? "—"}
                mono={!!row.idempotencyKey}
              />
              <Detail label="API key" value={row.apiKeyId ?? "—"} mono={!!row.apiKeyId} />
              <Detail label="IP" value={row.ip ?? "—"} mono={!!row.ip} />
              <Detail
                label="Request size"
                value={row.requestBytes != null ? `${row.requestBytes} B` : "—"}
              />
              <Detail
                label="Response size"
                value={row.responseBytes != null ? `${row.responseBytes} B` : "—"}
              />
              <Detail label="Latency" value={`${row.latencyMs} ms`} />
            </dl>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </dt>
      <dd className={cn("truncate text-xs", mono ? "font-mono" : "text-muted-foreground")}>
        {value}
      </dd>
    </div>
  );
}

function EmptyLogs({ onlyErrors }: { onlyErrors: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <ScrollText className="size-7 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {onlyErrors ? "No errors in this workspace" : "No requests yet"}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {onlyErrors
            ? "Every REST call has returned a 2xx or 3xx. Turn off the filter to see all traffic."
            : "Call the REST API with one of your keys and every request will show up here."}
        </p>
      </div>
    </div>
  );
}
