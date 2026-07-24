import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  // marketing-canvas paints ONE continuous background (a page-wide gradient flow
  // + grain) behind everything, so the page reads as a single surface. `light`
  // re-declares the light token set for this subtree, keeping the public pages
  // light independently of the app root.
  return (
    <div className="light marketing-canvas relative flex min-h-svh flex-col text-foreground">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
