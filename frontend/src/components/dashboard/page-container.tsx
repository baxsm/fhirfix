type PageWidth = "full" | "default" | "reading";

/**
 * the horizontal inset of the content column.
 *
 * the topbar and the scrolling content BOTH use this. when only `main` had it,
 * the breadcrumb sat 104px left of the page heading it labels.
 */
export const contentInset = "px-1 sm:px-2 xl:px-12 2xl:px-28";

/**
 * every dashboard page renders inside one of these. three widths, and they have
 * to actually differ - an earlier version had two of the three set to
 * `max-w-none`, which made the choice meaningless and left `reading` doing all
 * the work at a width too narrow for an editor.
 *
 * `mx-auto` is deliberately absent: centering splits leftover space on both
 * sides, which is what moved the content 71px between runs and billing. only
 * `max-width` varies, inside the constant inset above, so the left edge is
 * identical on every page (polaris/carbon do the same).
 */
// the shell's symmetric inset is what balances the page. a SECOND cap on the
// default pages fights it and dumps the leftover on one side - at 1920 a
// 1180 cap left 112px on the left and 386px on the right. only `reading` caps,
// because that is the one case where line length is the real constraint.
const widths: Record<PageWidth, string> = {
  // wide tables and logs: every column the data needs
  full: "max-w-none",
  // the default: the inset decides the width
  default: "max-w-none",
  // prose and single-column forms, where line length is the constraint
  reading: "max-w-[820px]",
};

export function PageContainer({
  width = "default",
  children,
}: {
  width?: PageWidth;
  children: React.ReactNode;
}) {
  return <div className={`w-full space-y-5 ${widths[width]}`}>{children}</div>;
}

export type { PageWidth };
