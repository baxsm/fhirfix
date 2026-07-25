"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, ScrollText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChoiceChip, ChoiceGroup, FilterPill } from "@/components/ui/segmented";
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

/**
 * the RECENT slice, for the API access overview. it takes no filters on purpose.
 *
 * the section used to carry the full filter set and 25 rows, which forced a
 * fixed 585px frame: switching ALL/POST/GET genuinely changes the row count
 * (21 -> 11 -> 10 measured), so without a frame every filter click reflowed the
 * whole page and moved the control out from under the pointer. the frame fixed
 * the symptom but left a section that was mostly empty whenever a filter matched
 * little.
 *
 * showing a fixed small number with no filters removes the problem rather than
 * padding around it - the height cannot change because the row count cannot
 * change. filtering and paging live on the full page, which has the room for it.
 */
const RECENT_LIMIT = 8;

export function RecentRequestLogs({
  workspaceId,
  workspace,
}: {
  workspaceId: string;
  workspace: string;
}) {
  const trpc = useTRPC();
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({
    ...trpc.developers.requestLogs.list.queryOptions({ workspaceId, limit: RECENT_LIMIT }),
    enabled: !!workspaceId,
  });

  const rows = (query.data?.logs ?? []) as LogRow[];

  if (query.isPending) return <Skeleton className="h-[280px] w-full" />;
  if (query.isError) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">Could not load request logs.</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  if (rows.length === 0) return <EmptyLogs onlyErrors={false} />;

  return (
    <div className="space-y-3">
      <div className="-mx-4">
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
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/app/${workspace}/developers/logs`}>
            View all logs
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
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

  // the list scrolls INSIDE a fixed frame rather than growing the page.
  //
  // an earlier attempt held the height only while the query was in flight,
  // which did nothing: the data is cached, so `isPlaceholderData` is never true
  // long enough to matter. measured, POST still collapsed the page by 389px.
  //
  // the collapse is not a loading artifact - it is the row count genuinely
  // changing (21 -> 11 -> 10). a section that pages at 25 must occupy the same
  // space whatever the current filter matches, or every filter click reflows
  // everything below it and the control you just clicked moves under the
  // pointer. 15 rows of frame, the rest scrolls.
  const FRAME_HEIGHT = 15 * 39;

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
        {/* method is one choice from a short closed set where "ALL" is itself a
            member, so it is the real segmented-control case. role=group, not
            tablist: primer is explicit that a segmented control must not take
            the tablist role (the keyboard contract differs - tab moves between
            segments, not arrows). */}
        <ChoiceGroup label="Filter by method">
          {METHODS.map((m) => (
            <ChoiceChip
              key={m}
              active={method === m}
              onClick={() => changeFilter(() => setMethod(m))}
            >
              {m}
            </ChoiceChip>
          ))}
        </ChoiceGroup>
        {/* was a native checkbox tinted with --interactive, i.e. the link blue,
            which is the same borrowed-colour bug as the api-key dialog. errors
            only is a filter, so it uses the filter material. */}
        <FilterPill
          active={onlyErrors}
          tone="danger"
          onClick={() => changeFilter(() => setOnlyErrors(!onlyErrors))}
        >
          Errors only
        </FilterPill>
      </div>

      {/* EVERY state occupies the same frame - rows, empty, error and loading.
          framing only the populated list still let "Errors only" (which has no
          matches) collapse the section by 506px, because the empty state
          rendered outside the frame. */}
      {query.isPending && rows.length === 0 ? (
        <div style={{ height: FRAME_HEIGHT }}>
          <Skeleton className="h-full w-full" />
        </div>
      ) : query.isError && rows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 text-center"
          style={{ height: FRAME_HEIGHT }}
        >
          <p className="text-sm text-muted-foreground">Could not load request logs.</p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center" style={{ height: FRAME_HEIGHT }}>
          <EmptyLogs onlyErrors={onlyErrors} />
        </div>
      ) : (
        <>
          <div
            className={cn("-mx-4 overflow-y-auto", stale && "is-stale")}
            // a FIXED height, not just a cap. capping alone still let a filter
            // with fewer rows shrink the frame (measured: POST still jumped
            // 159px). the frame is the same size whatever is in it.
            style={{ height: FRAME_HEIGHT }}
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
