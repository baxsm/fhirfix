"use client";

import { useId } from "react";

interface TrendPoint {
  id: string;
  createdAt: string | Date;
  before: number | null;
  after: number | null;
  findingsTotal: number;
}

interface LatestRun {
  conformanceScoreBefore: number | null;
  conformanceScoreAfter: number | null;
  findingsTotal: number;
  findingsAutoFixable: number;
}

// the score is a 0-1000 budget, so the axis is fixed rather than fitted to the
// data. a chart that rescales to its own min/max makes a 20-point wobble look
// like a cliff.
const MAX_SCORE = 1000;
const W = 320;
const H = 96;
// the endpoint dot is drawn at the last x, so without an inset half of it falls
// outside the viewBox and gets clipped flat against the card edge. padding the
// svg's css box does not help: preserveAspectRatio="none" stretches the viewBox
// to whatever box it is given, so the inset has to live in the coordinate space.
const PAD_X = 5;
const PAD_Y = 6;
const PLOT_W = W - PAD_X * 2;
const PLOT_H = H - PAD_Y * 2;

/**
 * conformance score over time.
 *
 * hand-drawn svg rather than recharts: this is one series of at most 60 points
 * with no axes, tooltip or legend, and the whole thing is ~40 lines. pulling a
 * chart library in for it would cost more than it saves.
 */
export function ScoreTrend({ points, latest }: { points: TrendPoint[]; latest?: LatestRun }) {
  const gradientId = useId();
  const scored = points.filter((p): p is TrendPoint & { after: number } => p.after != null);

  if (scored.length < 2) {
    return (
      <div className="raised flex h-full min-h-[196px] flex-col justify-center gap-2 rounded-lg border bg-card p-5 text-center">
        <p className="text-sm font-medium">Not enough history yet</p>
        <p className="text-xs text-muted-foreground">
          The trend appears once this workspace has two or more scored runs.
        </p>
      </div>
    );
  }

  const step = PLOT_W / (scored.length - 1);
  const y = (v: number) => PAD_Y + PLOT_H - (v / MAX_SCORE) * PLOT_H;
  const coords = scored.map((p, i) => ({ x: PAD_X + i * step, y: y(p.after), v: p.after }));

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${W - PAD_X},${H} L${PAD_X},${H} Z`;

  const last = coords[coords.length - 1];
  const current = latest?.conformanceScoreAfter ?? last?.v ?? 0;

  // deliberately NOT first-vs-last. each run scores a different input, so
  // "latest minus oldest" compares two unrelated resources and produces a
  // number that looks like progress but measures nothing. the honest summary
  // of a series of independent runs is its typical value.
  const median = (() => {
    const sorted = [...scored.map((p) => p.after)].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const value =
      sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : sorted[mid];
    return Math.round(value ?? 0);
  })();

  return (
    <div className="raised flex flex-col rounded-lg border bg-card">
      {/* the title lives INSIDE the card, matching the runs panel beside it.
          previously both headers floated above their cards, which left the two
          columns reading as different kinds of object. */}
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
          Conformance trend
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          median {median} · {scored.length} runs
        </span>
      </div>

      {/* the score gets its own band with real clearance below it. sharing a
          band with the plot meant the trend line ran level with the digits. */}
      <div className="flex items-baseline gap-2 px-4 pt-3 pb-4">
        <span className="font-mono text-2xl tabular-nums leading-none">{current}</span>
        <span className="text-xs text-muted-foreground">/ {MAX_SCORE}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
          latest of {scored.length}
        </span>
      </div>

      {/* a FIXED height. flex-1 let this balloon to 340px and swallow the whole
          viewport; a sparkline's job is to be glanceable, not to fill whatever
          space exists. no css padding here - the inset lives in the viewBox
          (PAD_X/PAD_Y), because preserveAspectRatio="none" would just stretch
          the plot back over any padding applied to the box. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-1 h-20 w-full"
        role="img"
        aria-label={`Conformance score trend across ${scored.length} runs, currently ${current} out of ${MAX_SCORE}`}
      >
        {/* the line is INK, not emerald. emerald means "conformant/pass" in this
            product; a score history is neither, and tinting it green asserts
            that a falling line is good news. */}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* two references: the top of the budget, and the median. the median is
            the line the eye should compare each run against. */}
        <line
          x1={PAD_X}
          y1={y(MAX_SCORE)}
          x2={W - PAD_X}
          y2={y(MAX_SCORE)}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={PAD_X}
          y1={y(median)}
          x2={W - PAD_X}
          y2={y(median)}
          stroke="var(--primary)"
          strokeWidth="1"
          strokeOpacity="0.35"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="1.5"
          strokeOpacity="0.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* the endpoint is emphasised: it is the number the header states.
            a dot cannot survive preserveAspectRatio="none" (the viewBox is
            stretched ~3x horizontally, so a circle renders as a flat lozenge),
            so it is drawn as a zero-length round-capped line instead: a stroke
            linecap is applied in device space and stays perfectly round at any
            scale. */}
        {last && (
          <line
            x1={last.x}
            y1={last.y}
            x2={last.x}
            y2={last.y}
            stroke="var(--foreground)"
            strokeWidth="6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {latest && (
        // the card lost its padding when the header moved inside it, so this
        // footer has to carry its own - it was sitting flush against the left
        // edge with a full-bleed rule above it.
        <p className="mt-3 border-t px-4 py-2.5 text-xs text-muted-foreground">
          Last run: {latest.findingsTotal} {latest.findingsTotal === 1 ? "finding" : "findings"}
          {latest.findingsAutoFixable > 0 && (
            <>
              , <span className="text-success">{latest.findingsAutoFixable} auto-fixed</span>
            </>
          )}
          .
        </p>
      )}
    </div>
  );
}
