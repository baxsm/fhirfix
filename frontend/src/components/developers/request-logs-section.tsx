"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, ScrollText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChoiceChip } from "@/components/ui/segmented";
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

// a 2xx is the expected outcome of an api call, so it is NOT coloured. filling
// every successful row with a green chip is what made the one 500 impossible to
// spot. the -400 shades used before were dark-theme values anyway, which read as
// washed-out pastel on white.
export function statusTone(code: number): string {
  if (code >= 500) return "border-destructive/30 bg-destructive/5 text-destructive";
  if (code >= 400) return "border-warning/40 bg-warning/5 text-warning";
  if (code >= 300) return "border-info/30 bg-info/5 text-info";
  return "border-border text-muted-foreground";
}

export function RequestLogsSection({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();

  const [method, setMethod] = useState<(typeof METHODS)[number]>("ALL");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState<string | null>(null);

  // placeholderData keeps the previous page mounted while the next one loads.
  // this is what stops the table emptying on a filter change: the old rows
  // stay, so the container never collapses and the page height holds.
  const query = useQuery({
    ...trpc.developers.requestLogs.list.queryOptions({
      workspaceId,
      method: method === "ALL" ? undefined : method,
      onlyErrors: onlyErrors || undefined,
      cursor,
      limit: 25,
    }),
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
  });

  const rows = (query.data?.logs ?? []) as LogRow[];
  // placeholderData always reports success, so the only way to know the rows on
  // screen belong to the previous filter is this flag.
  const stale = query.isPlaceholderData;

  // hold the height WHILE a filter change is in flight, then let it settle to
  // whatever the new result actually needs.
  //
  // `keepPreviousData` alone does not prevent the collapse: changing a filter
  // also resets the cursor, which changes the query key. and even once the new
  // rows arrive, going from 25 matches to 2 legitimately shortens the section -
  // the bug is the page jumping mid-interaction, not the final height. so the
  // floor applies only during the stale window and is released after.
  const listRef = useRef<HTMLDivElement>(null);
  const [heldHeight, setHeldHeight] = useState<number | null>(null);
  useEffect(() => {
    if (stale) {
      // entering the stale window: freeze whatever is on screen now
      setHeldHeight((prev) => prev ?? listRef.current?.offsetHeight ?? null);
    } else {
      setHeldHeight(null);
    }
  }, [stale]);

  // changing a filter resets pagination back to the first page.
  const changeFilter = (fn: () => void) => {
    fn();
    setCursor(undefined);
    setExpanded(null);
  };

  const hasMore = query.data?.hasMore ?? false;
  const nextCursor = query.data?.nextCursor ?? undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* role=group, not tablist: a segmented filter is a mode selector, and
            primer is explicit that it must not take the tablist role (the
            keyboard contract differs - tab moves between segments, not arrows). */}
        <fieldset
          aria-label="Filter by method"
          className="inline-flex gap-0.5 rounded-md border p-0.5"
        >
          {METHODS.map((m) => (
            <ChoiceChip
              key={m}
              active={method === m}
              onClick={() => changeFilter(() => setMethod(m))}
            >
              {m}
            </ChoiceChip>
          ))}
        </fieldset>
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
          <div
            ref={listRef}
            className={cn("-mx-4", stale && "is-stale")}
            style={heldHeight ? { minHeight: heldHeight } : undefined}
          >
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

          {/* page forward/back rather than an ever-growing list. an endless
              accumulating table is the thing that makes finding one request
              impossible once a workspace has real traffic. */}
          {(hasMore || cursor) && (
            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-mono text-[11px] text-muted-foreground">
                {rows.length} shown
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!cursor || stale}
                  onClick={() => {
                    setCursor(undefined);
                    setExpanded(null);
                  }}
                >
                  Newest
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMore || stale}
                  onClick={() => {
                    setCursor(nextCursor);
                    setExpanded(null);
                  }}
                >
                  Older
                </Button>
              </div>
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
    <EmptyState
      icon={ScrollText}
      title={onlyErrors ? "No errors in this workspace" : "No requests yet"}
      body={
        onlyErrors
          ? "Every REST call has returned a 2xx or 3xx. Turn off the filter to see all traffic."
          : "Call the REST API with one of your keys and every request will show up here."
      }
    />
  );
}
