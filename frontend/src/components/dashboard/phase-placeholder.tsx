import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";

// honest placeholder for routes whose feature lands in a later phase.
//
// it used to say "Not built yet ... arrives in Phase 7", which tells the user
// about our roadmap and leaves them at a dead end. helios and carbon both say a
// feature that is unavailable needs the reason plus a way forward, never a
// terminal message. so: name what the screen will do, and offer the thing that
// does the closest job today.
export function PhasePlaceholder({
  title,
  icon: Icon,
  description,
  whatItWillDo,
  meanwhile,
}: {
  title: string;
  icon: LucideIcon;
  description: string;
  whatItWillDo: string;
  meanwhile?: { label: string; href: string; body: string };
}) {
  return (
    <PageContainer width="reading">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <div className="raised space-y-4 rounded-lg border bg-card p-5">
        <div className="flex gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-canvas">
            <Icon className="size-4 text-muted-foreground" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">Not available yet</p>
            <p className="text-sm text-muted-foreground">{whatItWillDo}</p>
          </div>
        </div>

        {meanwhile && (
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{meanwhile.body}</p>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={meanwhile.href}>{meanwhile.label}</Link>
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
