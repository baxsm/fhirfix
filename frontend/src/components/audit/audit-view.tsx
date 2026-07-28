"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPill } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { auditCsv, downloadCsv } from "./audit-csv";
import { ACTION_LABELS, actorLabel, targetLabel } from "./audit-labels";

interface AuditRow {
  id: string;
  action: string;
  actorType: "user" | "api_key" | "system";
  actorId: string | null;
  actorName: string | null;
  targetRef: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | Date;
}

const PAGE = 25;
const FRAME_HEIGHT = 15 * 39;

function fmtDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditView({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const [action, setAction] = useState<string | undefined>();
  const [cursor, setCursor] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<string | null>(null);

  // only the actions this workspace has actually recorded, so the filter never
  // offers a value that returns nothing.
  const actionsQuery = useQuery({
    ...trpc.audit.actions.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const query = useQuery({
    ...trpc.audit.list.queryOptions({ workspaceId, action: action as never, cursor, limit: PAGE }),
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
  });

  const exportQuery = useQuery({
    ...trpc.audit.exportCsv.queryOptions({ workspaceId, action: action as never }),
    enabled: false,
  });

  const rows = (query.data?.entries ?? []) as AuditRow[];
  const stale = query.isPlaceholderData;
  const hasMore = query.data?.hasMore ?? false;
  const availableActions = actionsQuery.data ?? [];

  const changeFilter = (next: string | undefined) => {
    setAction(next);
    setCursor(undefined);
    setExpanded(null);
  };

  const runExport = async () => {
    const result = await exportQuery.refetch();
    if (result.data) downloadCsv(auditCsv(result.data as AuditRow[]), "audit-log.csv");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={!action} onClick={() => changeFilter(undefined)}>
          All events
        </FilterPill>
        {availableActions.map((a) => (
          <FilterPill key={a} active={action === a} onClick={() => changeFilter(a)}>
            {ACTION_LABELS[a] ?? a}
          </FilterPill>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={exportQuery.isFetching || rows.length === 0}
          onClick={runExport}
        >
          <Download className="size-3.5" />
          {exportQuery.isFetching ? "Preparing..." : "Export CSV"}
        </Button>
      </div>

      {query.isPending && rows.length === 0 ? (
        <div style={{ height: FRAME_HEIGHT }}>
          <Skeleton className="h-full w-full" />
        </div>
      ) : query.isError && rows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 text-center"
          style={{ height: FRAME_HEIGHT }}
        >
          <p className="text-sm text-muted-foreground">Could not load the audit log.</p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: FRAME_HEIGHT }}>
          {/* nested drops the body, so the title carries the whole message */}
          <EmptyState
            nested
            className="w-full"
            title={
              action
                ? "No events of this type yet"
                : "Nothing recorded yet. Actions appear here as they happen."
            }
          />
        </div>
      ) : (
        <>
          <div
            className={cn("-mx-4 overflow-y-auto", stale && "is-stale")}
            style={{ height: FRAME_HEIGHT }}
          >
            <Table>
              <TableBody>
                {rows.map((r) => (
                  <AuditEntry
                    key={r.id}
                    row={r}
                    workspaceId={workspaceId}
                    open={expanded === r.id}
                    onToggle={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {(hasMore || cursor) && (
            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-mono text-[0.6875rem] text-muted-foreground">
                {rows.length} shown
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={stale}
                  aria-disabled={!cursor}
                  onClick={() => {
                    if (!cursor) return;
                    setCursor(undefined);
                    setExpanded(null);
                  }}
                >
                  Newest
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={stale}
                  aria-disabled={!hasMore}
                  onClick={() => {
                    if (!hasMore) return;
                    setCursor(query.data?.nextCursor ?? undefined);
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

function AuditEntry({
  row,
  workspaceId,
  open,
  onToggle,
}: {
  row: AuditRow;
  workspaceId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const meta = row.metadata ?? {};
  const metaEntries = Object.entries(meta);

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
          <span className="text-xs font-medium">{ACTION_LABELS[row.action] ?? row.action}</span>
        </TableCell>
        <TableCell className="min-w-0 pr-3">
          <span className="text-xs text-muted-foreground">{actorLabel(row)}</span>
        </TableCell>
        <TableCell className="min-w-0 pr-3">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {targetLabel({ ...row, workspaceId })}
          </span>
        </TableCell>
        <TableCell className="pr-5 text-right text-xs whitespace-nowrap text-muted-foreground">
          {fmtDateTime(row.createdAt)}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={5} className="px-5 py-3 whitespace-normal">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              <Detail label="Event ID" value={row.id} mono />
              <Detail label="Actor" value={actorLabel(row)} />
              <Detail label="Actor ID" value={row.actorId ?? "—"} mono={!!row.actorId} />
              <Detail label="Target" value={row.targetRef ?? "—"} mono={!!row.targetRef} />
              <Detail label="IP" value={row.ip ?? "—"} mono={!!row.ip} />
              <Detail label="Recorded" value={new Date(row.createdAt).toLocaleString()} />
              {metaEntries.map(([k, v]) => (
                <Detail key={k} label={k} value={formatMetaValue(v)} mono />
              ))}
            </dl>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function formatMetaValue(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[0.75rem] font-medium tracking-wide text-muted-foreground/70 uppercase">
        {label}
      </dt>
      <dd className={cn("truncate text-xs", mono ? "font-mono" : "text-muted-foreground")}>
        {value}
      </dd>
    </div>
  );
}
