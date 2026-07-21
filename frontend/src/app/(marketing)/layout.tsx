import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

// public pages are light-only (owner call: theme switch is a dashboard-only thing,
// Upwork-style). the `light` class re-declares the light token set for this subtree
// even though <html> carries the root .dark class, so these routes stay light
// regardless of the saved dashboard theme. see globals.css `:root, .light`.
// (a nested next-themes provider does NOT work here — both providers write the
// class on <html> and the root dark default wins.)
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    // marketing-canvas paints ONE continuous background (a page-wide gradient flow +
    // grain) behind everything, so the page reads as a single surface. its fixed
    // background layers also cover overscroll, so the dark <body> never shows through.
    <div className="light marketing-canvas relative flex min-h-svh flex-col text-foreground">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
