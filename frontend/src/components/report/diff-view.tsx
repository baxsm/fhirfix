"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// a small, dependency-free before/after diff. line-level LCS with word-level
// intra-line highlighting on changed pairs, a split/unified toggle, and collapse
// of long unchanged runs. built for JSON/FHIR payloads; falls back to whole-line
// highlighting when a line is too long to word-diff usefully.

type Op = "same" | "add" | "del";
interface LineRow {
  op: Op;
  left: string | null;
  right: string | null;
  leftNo: number | null;
  rightNo: number | null;
}

// build an LCS length table for two token arrays. returns an (n+1)x(m+1) matrix
// where lcs[i][j] is the LCS length of a[i:] and b[j:].
function lcsTable(a: string[], b: string[]): number[][] {
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    const rowI = lcs[i] as number[];
    const rowI1 = lcs[i + 1] as number[];
    for (let j = m - 1; j >= 0; j--) {
      rowI[j] =
        a[i] === b[j]
          ? (rowI1[j + 1] as number) + 1
          : Math.max(rowI1[j] as number, rowI[j + 1] as number);
    }
  }
  return lcs;
}

// classic LCS over lines, then walk the tables to produce aligned rows.
function diffLines(a: string[], b: string[]): LineRow[] {
  const n = a.length;
  const m = b.length;
  const lcs = lcsTable(a, b);
  const rows: LineRow[] = [];
  let i = 0;
  let j = 0;
  let la = 1;
  let lb = 1;
  while (i < n && j < m) {
    const av = a[i] ?? "";
    const bv = b[j] ?? "";
    if (av === bv) {
      rows.push({ op: "same", left: av, right: bv, leftNo: la++, rightNo: lb++ });
      i++;
      j++;
    } else if ((lcs[i + 1]?.[j] ?? 0) >= (lcs[i]?.[j + 1] ?? 0)) {
      rows.push({ op: "del", left: av, right: null, leftNo: la++, rightNo: null });
      i++;
    } else {
      rows.push({ op: "add", left: null, right: bv, leftNo: null, rightNo: lb++ });
      j++;
    }
  }
  while (i < n)
    rows.push({ op: "del", left: a[i++] ?? "", right: null, leftNo: la++, rightNo: null });
  while (j < m)
    rows.push({ op: "add", left: null, right: b[j++] ?? "", leftNo: null, rightNo: lb++ });
  return rows;
}

// word-level diff for one changed line pair. returns token spans for each side.
function diffWords(before: string, after: string) {
  if (before.length > 400 || after.length > 400) {
    return { before: [{ t: before, c: false }], after: [{ t: after, c: false }] };
  }
  const split = (s: string) => s.split(/(\s+|["{}[\],:])/).filter((x) => x.length > 0);
  const a = split(before);
  const b = split(after);
  const n = a.length;
  const m = b.length;
  const lcs = lcsTable(a, b);
  const beforeTok: Array<{ t: string; c: boolean }> = [];
  const afterTok: Array<{ t: string; c: boolean }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const av = a[i] ?? "";
    const bv = b[j] ?? "";
    if (av === bv) {
      beforeTok.push({ t: av, c: false });
      afterTok.push({ t: bv, c: false });
      i++;
      j++;
    } else if ((lcs[i + 1]?.[j] ?? 0) >= (lcs[i]?.[j + 1] ?? 0)) {
      beforeTok.push({ t: av, c: true });
      i++;
    } else {
      afterTok.push({ t: bv, c: true });
      j++;
    }
  }
  while (i < n) beforeTok.push({ t: a[i++] ?? "", c: true });
  while (j < m) afterTok.push({ t: b[j++] ?? "", c: true });
  return { before: beforeTok, after: afterTok };
}

function Tokens({
  tokens,
  tone,
}: {
  tokens: Array<{ t: string; c: boolean }>;
  tone: "add" | "del";
}) {
  return (
    <>
      {tokens.map((tok, k) => (
        <span
          key={`${k}-${tok.t}`}
          className={cn(
            tok.c &&
              (tone === "add"
                ? "rounded-[3px] bg-emerald-500/25 text-emerald-200"
                : "rounded-[3px] bg-red-500/25 text-red-200"),
          )}
        >
          {tok.t}
        </span>
      ))}
    </>
  );
}

const GUTTER = "select-none pr-3 text-right text-[10px] text-muted-foreground/50 tabular-nums";

export function DiffView({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [split, setSplit] = useState(true);
  const rows = useMemo(() => diffLines(before.split("\n"), after.split("\n")), [before, after]);

  // collapse runs of >6 unchanged lines to keep large diffs readable, leaving 3
  // lines of context on each side of a change.
  const collapsed = useMemo(() => collapse(rows), [rows]);
  const changedCount = rows.filter((r) => r.op !== "same").length;

  return (
    <div className="overflow-hidden rounded-md border bg-card raised">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">
          {changedCount} changed {changedCount === 1 ? "line" : "lines"}
        </span>
        <div className="flex overflow-hidden rounded-md border text-[11px]">
          <button
            type="button"
            onClick={() => setSplit(true)}
            className={cn(
              "cursor-pointer px-2 py-0.5",
              split ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            Split
          </button>
          <button
            type="button"
            onClick={() => setSplit(false)}
            className={cn(
              "cursor-pointer border-l px-2 py-0.5",
              !split ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            Unified
          </button>
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto">
        {split ? (
          <SplitBody rows={collapsed} beforeLabel={beforeLabel} afterLabel={afterLabel} />
        ) : (
          <UnifiedBody rows={collapsed} />
        )}
      </div>
    </div>
  );
}

type Collapsed = { kind: "gap"; count: number } | { kind: "row"; row: LineRow };

function collapse(rows: LineRow[]): Collapsed[] {
  const out: Collapsed[] = [];
  let run: LineRow[] = [];
  const flush = () => {
    if (run.length > 6) {
      const head = run.slice(0, 3);
      const tail = run.slice(-3);
      for (const r of head) out.push({ kind: "row", row: r });
      out.push({ kind: "gap", count: run.length - 6 });
      for (const r of tail) out.push({ kind: "row", row: r });
    } else {
      for (const r of run) out.push({ kind: "row", row: r });
    }
    run = [];
  };
  for (const r of rows) {
    if (r.op === "same") {
      run.push(r);
    } else {
      flush();
      out.push({ kind: "row", row: r });
    }
  }
  flush();
  return out;
}

// pair adjacent del/add rows for word-level highlighting in split view.
function SplitBody({
  rows,
  beforeLabel,
  afterLabel,
}: {
  rows: Collapsed[];
  beforeLabel: string;
  afterLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 font-mono text-[11px] leading-[1.6] sm:grid-cols-2">
      <div className="border-b sm:border-b-0 sm:border-r">
        <div className="sticky top-0 border-b bg-muted/40 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {beforeLabel}
        </div>
        {rows.map((c, idx) =>
          c.kind === "gap" ? (
            <GapRow key={`lg${idx}`} count={c.count} />
          ) : (
            <SideLine key={`l${idx}`} row={c.row} side="left" pair={pairFor(rows, idx)} />
          ),
        )}
      </div>
      <div>
        <div className="sticky top-0 border-b bg-muted/40 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {afterLabel}
        </div>
        {rows.map((c, idx) =>
          c.kind === "gap" ? (
            <GapRow key={`rg${idx}`} count={c.count} />
          ) : (
            <SideLine key={`r${idx}`} row={c.row} side="right" pair={pairFor(rows, idx)} />
          ),
        )}
      </div>
    </div>
  );
}

// find the opposite-side row of a del/add pair at the same visual position.
function pairFor(rows: Collapsed[], idx: number): LineRow | null {
  const cur = rows[idx];
  if (cur?.kind !== "row") return null;
  if (cur.row.op === "del") {
    const nxt = rows[idx + 1];
    if (nxt?.kind === "row" && nxt.row.op === "add") return nxt.row;
  }
  if (cur.row.op === "add") {
    const prev = rows[idx - 1];
    if (prev?.kind === "row" && prev.row.op === "del") return prev.row;
  }
  return null;
}

function SideLine({
  row,
  side,
  pair,
}: {
  row: LineRow;
  side: "left" | "right";
  pair: LineRow | null;
}) {
  const text = side === "left" ? row.left : row.right;
  const no = side === "left" ? row.leftNo : row.rightNo;
  if (text == null) {
    return <div className="flex bg-muted/10 px-3 py-px">&nbsp;</div>;
  }
  const isChange = (side === "left" && row.op === "del") || (side === "right" && row.op === "add");
  let content: React.ReactNode = text;
  if (isChange && pair) {
    // pair the del line (left) with the add line (right) for word-level tokens.
    const both =
      side === "left" ? diffWords(text, pair.right ?? "") : diffWords(pair.left ?? "", text);
    content =
      side === "left" ? (
        <Tokens tokens={both.before} tone="del" />
      ) : (
        <Tokens tokens={both.after} tone="add" />
      );
  }
  return (
    <div
      className={cn(
        "flex px-3 py-px",
        row.op === "del" && side === "left" && "bg-red-500/10",
        row.op === "add" && side === "right" && "bg-emerald-500/10",
      )}
    >
      <span className={GUTTER}>{no ?? ""}</span>
      <span className="whitespace-pre-wrap break-all">{content}</span>
    </div>
  );
}

function UnifiedBody({ rows }: { rows: Collapsed[] }) {
  return (
    <div className="font-mono text-[11px] leading-[1.6]">
      {rows.map((c, idx) => {
        if (c.kind === "gap") return <GapRow key={`ug${idx}`} count={c.count} />;
        const r = c.row;
        const text = r.op === "del" ? r.left : r.right;
        return (
          <div
            key={`u${idx}-${r.op}-${r.leftNo ?? r.rightNo ?? ""}`}
            className={cn(
              "flex px-3 py-px",
              r.op === "del" && "bg-red-500/10",
              r.op === "add" && "bg-emerald-500/10",
            )}
          >
            <span className="w-4 select-none text-muted-foreground/60">
              {r.op === "del" ? "-" : r.op === "add" ? "+" : " "}
            </span>
            <span className="whitespace-pre-wrap break-all">{text}</span>
          </div>
        );
      })}
    </div>
  );
}

function GapRow({ count }: { count: number }) {
  return (
    <div className="bg-muted/20 px-3 py-1 text-center text-[10px] text-muted-foreground/60">
      {count} unchanged {count === 1 ? "line" : "lines"}
    </div>
  );
}
