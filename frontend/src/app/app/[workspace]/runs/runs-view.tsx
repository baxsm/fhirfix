"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, FileScan } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useListOrganizations } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type Status = "queued" | "running" | "completed" | "failed";

interface RunRow {
  id: string;
  status: Status;
  inputType: string;
  conformanceScoreBefore: number | null;
  conformanceScoreAfter: number | null;
  findingsTotal: number;
  findingsAutoFixable: number;
  createdAt: string | Date;
}

const STATUS_TONE: Record<Status, string> = {
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  running: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  queued: "border-muted bg-muted/40 text-muted-foreground",
  failed: "border-red-500/30 bg-red-500/10 text-red-400",
};

function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunsView({ workspace }: { workspace: string }) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

  const router = useRouter();
  const trpc = useTRPC();

  const query = useQuery({
    ...trpc.run.list.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const runs = (query.data ?? []) as RunRow[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground">
            Every conformance check, with findings and before/after scores.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/app/${workspace}/check`}>
            <FileScan className="size-4" />
            New check
          </Link>
        </Button>
      </header>

      {query.isError ? (
        <ListError onRetry={() => query.refetch()} />
      ) : query.isLoading || !workspaceId ? (
        <SkeletonTable />
      ) : runs.length === 0 ? (
        <EmptyRuns workspace={workspace} />
      ) : (
        <div className="overflow-hidden rounded-md border raised">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[34%]">Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Findings</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">When</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => {
                  const href = `/app/${workspace}/runs/${r.id}`;
                  const go = () => router.push(href);
                  return (
                    <TableRow
                      key={r.id}
                      tabIndex={0}
                      role="button"
                      onClick={go}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          go();
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{r.id}</span>
                          <span className="font-mono text-[10px] uppercase text-muted-foreground">
                            {r.inputType}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("capitalize", STATUS_TONE[r.status])}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {r.findingsTotal}
                        {r.findingsAutoFixable > 0 && (
                          <span className="ml-1 text-emerald-400">
                            ({r.findingsAutoFixable} auto)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {r.conformanceScoreBefore != null && r.conformanceScoreAfter != null ? (
                          <span>
                            <span className="text-muted-foreground">
                              {r.conformanceScoreBefore}
                            </span>
                            <span className="mx-1 text-muted-foreground/50">→</span>
                            <span className="text-emerald-400">{r.conformanceScoreAfter}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {fmtDate(r.createdAt)}
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="size-3.5 text-muted-foreground/50" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-px overflow-hidden rounded-md border raised">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="h-8 flex-1 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyRuns({ workspace }: { workspace: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border bg-card px-6 py-16 text-center raised">
      <Activity className="size-8 text-muted-foreground" />
      <h2 className="font-medium">No runs yet</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Run your first conformance check to see findings, fixes, and before/after scores here.
      </p>
      <Button asChild size="sm">
        <Link href={`/app/${workspace}/check`}>
          <FileScan className="size-4" />
          Run a check
        </Link>
      </Button>
    </div>
  );
}

function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-red-500/20 bg-red-500/5 px-6 py-16 text-center raised">
      <h2 className="font-medium">Could not load runs</h2>
      <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
