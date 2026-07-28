"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/dashboard/page-container";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip, type StatusTone } from "@/components/ui/status";
import { useListOrganizations } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { CoverageMatrix } from "./coverage-matrix";
import { LaunchDialog } from "./launch-dialog";
import type { MatrixCell, RegressionEntry } from "./types";

const STATUS_TONE: Record<string, StatusTone> = {
  queued: "pending",
  running: "pending",
  completed: "success",
  failed: "danger",
  cancelled: "neutral",
};

const OVERALL_TONE: Record<string, StatusTone> = {
  pass: "success",
  fail: "danger",
  partial: "warning",
};

// a queued or running packet is still moving, so the list refetches until it settles
const ACTIVE_POLL_MS = 4000;

export function ConformanceView({
  workspace,
  workspaceId: serverWorkspaceId,
}: {
  workspace: string;
  workspaceId?: string;
}) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = serverWorkspaceId || active?.id || "";

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [launchOpen, setLaunchOpen] = useState(false);
  const [openPacket, setOpenPacket] = useState<string | null>(null);

  const listQuery = useQuery({
    ...trpc.conformance.list.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
    // the global staleTime would serve the cached row and skip the poll's fetch
    staleTime: 0,
    refetchInterval: (query) => {
      const rows = query.state.data ?? [];
      return rows.some((r) => r.status === "queued" || r.status === "running")
        ? ACTIVE_POLL_MS
        : false;
    },
    // a packet outlives the user's attention, so the poll must survive a background tab
    refetchIntervalInBackground: true,
  });

  const packets = listQuery.data ?? [];
  const selectedId = openPacket ?? packets[0]?.id ?? null;

  const packetQuery = useQuery({
    ...trpc.conformance.get.queryOptions({ workspaceId, packetRunId: selectedId ?? "" }),
    enabled: !!workspaceId && !!selectedId,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? ACTIVE_POLL_MS : false;
    },
    refetchIntervalInBackground: true,
  });

  const packet = packetQuery.data;

  const [downloading, setDownloading] = useState(false);

  async function downloadEvidence(packetRunId: string) {
    setDownloading(true);
    try {
      const bundle = await queryClient.fetchQuery(
        trpc.conformance.exportEvidence.queryOptions({ workspaceId, packetRunId }),
      );
      const blob = new Blob([bundle.content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${packetRunId}-evidence.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the evidence bundle");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <PageContainer width="full">
      <PageHeader
        title="Conformance packets"
        description={`Run the Da Vinci Inferno test kits against a live endpoint and keep the evidence for ${active?.name ?? "this workspace"}.`}
        actions={
          <Button onClick={() => setLaunchOpen(true)} disabled={!workspaceId}>
            New packet
          </Button>
        }
      />

      {listQuery.isError ? (
        <div className="rounded-xl border border-border">
          <EmptyState
            icon={ShieldCheck}
            title="Could not load packets"
            body="Check your connection and try again."
            action={
              <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
                Retry
              </Button>
            }
          />
        </div>
      ) : listQuery.isPending || !workspaceId ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : packets.length === 0 ? (
        <div className="rounded-xl border border-border">
          <EmptyState
            icon={ShieldCheck}
            title="No packets yet"
            body="Run the Inferno test kits against an endpoint to produce an audit evidence bundle."
            action={
              <Button size="sm" onClick={() => setLaunchOpen(true)}>
                New packet
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium text-muted-foreground">Endpoint</th>
                  <th className="w-32 px-3 py-2 font-medium text-muted-foreground">Status</th>
                  <th className="w-32 px-3 py-2 font-medium text-muted-foreground">Result</th>
                  <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">
                    Passed
                  </th>
                </tr>
              </thead>
              <tbody>
                {packets.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border transition-colors last:border-0 hover:bg-muted/40 ${
                      row.id === selectedId ? "bg-muted/50" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        aria-pressed={row.id === selectedId}
                        onClick={() => setOpenPacket(row.id)}
                        className="block w-full cursor-pointer text-left"
                      >
                        <span className="block truncate font-mono text-xs">
                          {row.targetEndpoint}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {row.testKits.join(", ")}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <StatusChip tone={STATUS_TONE[row.status] ?? "neutral"}>
                        {row.status}
                      </StatusChip>
                      {row.status === "failed" && row.errorMessage && (
                        <p className="mt-1 text-[11px] leading-relaxed text-destructive">
                          {row.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.overallResult ? (
                        <StatusChip tone={OVERALL_TONE[row.overallResult] ?? "neutral"}>
                          {row.overallResult}
                        </StatusChip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                      {row.passCount != null && row.failCount != null
                        ? `${row.passCount}/${row.passCount + row.failCount}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedId && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-medium">Coverage matrix</h2>
                  {packet?.infernoVersion && packet.infernoVersion !== "pending" && (
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      Inferno {packet.infernoVersion} ·{" "}
                      {Object.entries(packet.igVersions ?? {})
                        .map(([ig, version]) => `${ig}@${version}`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                {packet?.evidence && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={downloading}
                    onClick={() => downloadEvidence(selectedId)}
                  >
                    <Download className="size-3.5" aria-hidden />
                    {downloading ? "Preparing..." : "Evidence bundle"}
                  </Button>
                )}
              </div>

              {packet?.evidence && (
                <p className="font-mono text-[11px] break-all text-muted-foreground">
                  sha256 {packet.evidence.sha256}
                </p>
              )}

              {packetQuery.isPending ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : packet?.status === "running" || packet?.status === "queued" ? (
                <div className="rounded-xl border border-border">
                  <EmptyState
                    icon={ShieldCheck}
                    title={packet.status === "queued" ? "Packet is queued" : "Packet is running"}
                    body={progressLine(packet.status, packet.progress)}
                  />
                </div>
              ) : packet?.status === "failed" ? (
                <div className="rounded-xl border border-border">
                  <EmptyState
                    icon={ShieldCheck}
                    title="Packet failed"
                    body={packet.errorMessage ?? "The run did not finish."}
                  />
                </div>
              ) : (
                <CoverageMatrix
                  cells={(packet?.resultsMatrix ?? []) as MatrixCell[]}
                  regressions={(packet?.regressions ?? []) as RegressionEntry[]}
                />
              )}
            </section>
          )}
        </div>
      )}

      <LaunchDialog workspaceId={workspaceId} open={launchOpen} onOpenChange={setLaunchOpen} />
    </PageContainer>
  );
}

function progressLine(
  status: string,
  progress: Record<string, { total: number; completed: number }> | undefined,
) {
  const entries = Object.entries(progress ?? {});
  if (entries.length === 0) {
    return status === "queued"
      ? "Waiting for the runner to pick this up."
      : "Starting the test kits.";
  }
  return entries.map(([kit, p]) => `${kit} ${p.completed}/${p.total || "?"} tests`).join(" · ");
}
