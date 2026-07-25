"use client";

import { useId, useRef, useState } from "react";

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
const H = 96;
const PAD_X = 6;
const PAD_Y = 8;

function fmtDay(d: string | Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * conformance score over time.
 *
 * hand-drawn svg rather than a chart library: one series, no axes, no legend.
 * the interaction is the part worth writing by hand anyway - hovering anywhere
 * over the plot snaps to the nearest run and reports it.
 */
export function ScoreTrend({ points, latest }: { points: TrendPoint[]; latest?: LatestRun }) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const scored = points.filter((p): p is TrendPoint & { after: number } => p.after != null);

  if (scored.length < 2) {
    return (
      <div className="raised rounded-lg border bg-card">
        <div className="border-b px-4 py-2.5">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            Conformance trend
          </h3>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium">Not enough history yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The trend appears once this workspace has two or more scored runs.
          </p>
        </div>
      </div>
    );
  }

  // the viewBox scales with the number of points so the horizontal step stays
  // sane whether there are 3 runs or 60.
  const W = Math.max(160, scored.length * 24);
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_Y * 2;

  const step = plotW / (scored.length - 1);
  const y = (v: number) => PAD_Y + plotH - (v / MAX_SCORE) * plotH;
  const coords = scored.map((p, i) => ({ x: PAD_X + i * step, y: y(p.after), v: p.after, p }));

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

  // map the pointer to the nearest run rather than requiring a hit on the 3px
  // dot itself: anywhere in the plot's vertical band selects a column.
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const ratio = (e.clientX - box.left) / box.width;
    const i = Math.round((ratio * W - PAD_X) / step);
    setHover(Math.max(0, Math.min(scored.length - 1, i)));
  };

  const active = hover != null ? coords[hover] : null;
  const shown = active ?? last;

  return (
    <div className="raised rounded-lg border bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
          Conformance trend
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          median {median} · {scored.length} runs
        </span>
      </div>

      {/* the readout is driven by the hovered point and falls back to the latest
          run. it is a fixed-height row so moving across the chart never nudges
          the layout. */}
      <div className="flex h-[42px] items-baseline gap-2 px-4 pt-3">
        <span className="font-mono text-2xl tabular-nums leading-none">{shown?.v ?? current}</span>
        <span className="text-xs text-muted-foreground">/ {MAX_SCORE}</span>
        <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground/70">
          {shown ? fmtDay(shown.p.createdAt) : ""}
        </span>
      </div>

      {/* preserveAspectRatio="none" so the plot fills the card's width. the
          distortion that used to cause (squashed endpoint dot, uneven stroke
          weights) is handled instead by vectorEffect="non-scaling-stroke" on
          every stroked element, and by drawing the dots as stroked zero-length
          lines whose round caps render in device space. */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-20 w-full touch-none"
        role="img"
        aria-label={`Conformance score trend across ${scored.length} runs, currently ${current} out of ${MAX_SCORE}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* two references: the top of the budget, and the median. */}
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
          stroke="var(--success)"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="1.5"
          strokeOpacity="0.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* crosshair for the hovered run. */}
        {active && (
          <line
            x1={active.x}
            y1={PAD_Y}
            x2={active.x}
            y2={H - PAD_Y}
            stroke="var(--foreground)"
            strokeWidth="1"
            strokeOpacity="0.25"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* dots are zero-length round-capped lines, not circles: a <circle> in a
            horizontally stretched viewBox renders as a flat lozenge, whereas a
            stroke linecap is applied in device space and stays round.
            the hovered point is drawn larger, over a card-coloured cap, so it
            reads as a ring against the endpoint's solid dot. */}
        {last && (
          <line
            x1={last.x}
            y1={last.y}
            x2={last.x}
            y2={last.y}
            stroke="var(--foreground)"
            strokeWidth="5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {active && (
          <>
            <line
              x1={active.x}
              y1={active.y}
              x2={active.x}
              y2={active.y}
              stroke="var(--foreground)"
              strokeWidth="8"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={active.x}
              y1={active.y}
              x2={active.x}
              y2={active.y}
              stroke="var(--card)"
              strokeWidth="4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
        {active ? (
          <>
            <span className="font-mono">{active.p.id}</span> ·{" "}
            {active.p.findingsTotal === 1 ? "1 finding" : `${active.p.findingsTotal} findings`}
            {active.p.before != null && (
              <>
                {" · "}
                {active.p.before} → <span className="text-foreground">{active.v}</span>
              </>
            )}
          </>
        ) : latest ? (
          <>
            Last run: {latest.findingsTotal} {latest.findingsTotal === 1 ? "finding" : "findings"}
            {latest.findingsAutoFixable > 0 && (
              <>
                , <span className="text-success">{latest.findingsAutoFixable} auto-fixed</span>
              </>
            )}
            . Hover the chart to inspect a run.
          </>
        ) : null}
      </div>
    </div>
  );
}
