import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { DocsNav } from "@/components/docs/docs-nav";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "API docs · FHIRfix",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
        <Link href="/">
          <BrandMark size="md" />
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/playground">Playground</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-6">
        {/* left nav is pinned to the viewport and scrolls on its own, so the reader can jump sections */}
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-48 shrink-0 overflow-y-auto py-10 lg:block">
          <DocsNav />
        </aside>
        <main className="min-w-0 flex-1 pb-24 pt-10">{children}</main>
      </div>
    </div>
  );
}
