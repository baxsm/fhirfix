"use client";

import { ArrowDownRight, ArrowUpRight, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPill } from "@/components/ui/segmented";
import { StatusDot, type StatusTone } from "@/components/ui/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { InfernoResult, MatrixCell, RegressionEntry } from "./types";

const RESULT_TONE: Record<InfernoResult, StatusTone> = {
  pass: "success",
  fail: "danger",
  error: "danger",
  skip: "neutral",
  omit: "neutral",
  running: "pending",
  wait: "info",
  cancel: "neutral",
};

const RESULT_LABEL: Record<InfernoResult, string> = {
  pass: "Pass",
  fail: "Fail",
  error: "Error",
  skip: "Not tested",
  omit: "Omitted",
  running: "Running",
  wait: "Waiting",
  cancel: "Cancelled",
};

type Filter = "all" | "failed" | "untested";

export function CoverageMatrix({
  cells,
  regressions,
}: {
  cells: MatrixCell[];
  regressions: RegressionEntry[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [kit, setKit] = useState<string>("all");

  const kits = useMemo(() => [...new Set(cells.map((c) => c.testKit))], [cells]);

  const movedBy = useMemo(() => {
    const map = new Map<string, RegressionEntry>();
    for (const entry of regressions) map.set(`${entry.testKit}::${entry.requirementId}`, entry);
    return map;
  }, [regressions]);

  const visible = useMemo(() => {
    return cells.filter((cell) => {
      if (kit !== "all" && cell.testKit !== kit) return false;
      if (filter === "failed") return cell.result === "fail" || cell.result === "error";
      if (filter === "untested") return cell.result === "skip" || cell.result === "omit";
      return true;
    });
  }, [cells, filter, kit]);

  const failed = cells.filter((c) => c.result === "fail" || c.result === "error").length;
  const untested = cells.filter((c) => c.result === "skip" || c.result === "omit").length;

  if (cells.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No coverage yet"
        body="The matrix fills in once the packet finishes running."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={filter === "all"} count={cells.length} onClick={() => setFilter("all")}>
          All
        </FilterPill>
        <FilterPill
          active={filter === "failed"}
          count={failed}
          tone="danger"
          onClick={() => setFilter("failed")}
        >
          Failed
        </FilterPill>
        <FilterPill
          active={filter === "untested"}
          count={untested}
          onClick={() => setFilter("untested")}
        >
          Not tested
        </FilterPill>

        {kits.length > 1 && (
          <>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <FilterPill active={kit === "all"} onClick={() => setKit("all")}>
              All kits
            </FilterPill>
            {kits.map((id) => (
              <FilterPill key={id} active={kit === id} onClick={() => setKit(id)}>
                {id}
              </FilterPill>
            ))}
          </>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing matches this filter"
          body="Clear the filter to see the rest of the requirements."
        />
      ) : (
        <div
          key={`${filter}-${kit}`}
          className="raised enter overflow-hidden rounded-md border bg-card"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requirement</TableHead>
                <TableHead className="w-28">Level</TableHead>
                <TableHead className="w-36">Result</TableHead>
                <TableHead className="w-20 text-right">Tests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="enter-stagger">
              {visible.map((cell) => {
                const moved = movedBy.get(`${cell.testKit}::${cell.requirementId}`);
                return (
                  <TableRow key={`${cell.testKit}-${cell.requirementId}`} className="align-top">
                    <TableCell className="whitespace-normal">
                      <p className="leading-snug">{cell.requirement}</p>
                      <p className="mt-0.5 font-mono text-[0.6875rem] text-muted-foreground">
                        {cell.requirementId}
                      </p>
                      {cell.message && (
                        <p className="mt-1 text-xs leading-relaxed text-destructive">
                          {cell.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">
                        {cell.conformance}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-col items-start gap-1">
                        <StatusDot tone={RESULT_TONE[cell.result]}>
                          {RESULT_LABEL[cell.result]}
                        </StatusDot>
                        {moved && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[0.6875rem]",
                              moved.direction === "fixed" ? "text-success" : "text-destructive",
                            )}
                          >
                            {moved.direction === "fixed" ? (
                              <ArrowUpRight className="size-3" aria-hidden />
                            ) : (
                              <ArrowDownRight className="size-3" aria-hidden />
                            )}
                            {moved.direction === "fixed" ? "Fixed since" : "Regressed since"} last
                            run
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {cell.testIds.length}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
