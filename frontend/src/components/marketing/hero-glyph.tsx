import { cn } from "@/lib/utils";

// the hero centerpiece. line-art of a fragmented resource (left, with red error
// ticks) resolving into a clean, aligned resource (right, emerald, checked) — the
// literal product promise: broken -> conformant. distinct from the wordmark, but
// consistent with icon.svg (emerald pass color, rounded caps, thin precise strokes).
//
// the draw-in is CSS-only (see .glyph-draw in globals.css): strokes sweep in on
// load, and it degrades to fully visible if animation is off or unsupported —
// it can never get stuck invisible. reduced-motion is handled in the CSS.
//
// colors use theme tokens: --destructive (error), --primary (emerald pass),
// --muted-foreground / --foreground for neutral structure + the flow arrow.
export function HeroGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 140"
      fill="none"
      role="img"
      aria-label="A fragmented FHIR resource resolving into a conformant one"
      className={cn("glyph-draw h-auto w-full", className)}
    >
      <g strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        {/* ── left: the broken resource. bracket + misaligned rows + red ticks. ── */}
        <path
          d="M60 24 H30 a6 6 0 0 0 -6 6 V110 a6 6 0 0 0 6 6 H60"
          stroke="var(--muted-foreground)"
        />
        <path d="M38 44 H72" stroke="var(--muted-foreground)" />
        <path d="M38 62 H60" stroke="var(--muted-foreground)" />
        <path d="M44 80 H74" stroke="var(--muted-foreground)" />
        <path d="M38 98 H56" stroke="var(--muted-foreground)" />
        {/* red error ticks on broken rows */}
        <path d="M82 44 h6" stroke="var(--destructive)" />
        <path d="M82 80 h6" stroke="var(--destructive)" />

        {/* ── flow: broken becomes fixed ── */}
        <path d="M98 70 H130" stroke="var(--foreground)" />
        <path d="M122 62 L132 70 L122 78" stroke="var(--foreground)" />

        {/* ── right: the conformant resource. aligned rows, emerald, a check. ── */}
        <path d="M160 24 H190 a6 6 0 0 1 6 6 V110 a6 6 0 0 1 -6 6 H160" stroke="var(--primary)" />
        <path d="M148 44 H182" stroke="var(--primary)" />
        <path d="M148 62 H182" stroke="var(--primary)" />
        <path d="M148 80 H182" stroke="var(--primary)" />
        <path d="M148 98 H170" stroke="var(--primary)" />
        {/* conformant check badge, top-right */}
        <circle cx="196" cy="30" r="13" stroke="var(--primary)" />
        <path d="M190 30 l4 4 l8 -9" stroke="var(--primary)" />
      </g>
    </svg>
  );
}
