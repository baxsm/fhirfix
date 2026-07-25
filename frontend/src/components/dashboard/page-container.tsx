type PageWidth = "wide" | "standard" | "narrow";

// the shell varies max-width only. the left edge is a constant, so navigating
// between a table and a form never shifts the content sideways.
//
// centering (mx-auto) is deliberately absent: it splits leftover space on both
// sides, which is what moved the content 71px when going from runs to billing.
// polaris and carbon both vary max-width inside a fixed gutter for this reason.
// the shell's symmetric inset is what balances the page, so only `narrow` caps
// width here. a second cap on the default pages fought the inset and left the
// gap lopsided (64px left, 174px right at 1920).
const widths: Record<PageWidth, string> = {
  // tables and logs
  wide: "max-w-none",
  // the default
  standard: "max-w-none",
  // forms and single-column reading, where line length actually matters
  narrow: "max-w-[760px]",
};

export function PageContainer({
  width = "standard",
  children,
}: {
  width?: PageWidth;
  children: React.ReactNode;
}) {
  return <div className={`w-full space-y-5 ${widths[width]}`}>{children}</div>;
}

export type { PageWidth };
