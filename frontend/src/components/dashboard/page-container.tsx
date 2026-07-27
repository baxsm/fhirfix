type PageWidth = "full" | "default" | "reading";

export const contentInset = "px-1 sm:px-2 xl:px-12 2xl:px-28";

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
