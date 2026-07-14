import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// shared settings frame used by both the workspace settings page and the
// personal account page, so the two sibling "manage your stuff" surfaces read
// the same. one bordered card per section, dividers inside for grouping
// (no card-in-card).
export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="raised overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start gap-3 border-b px-5 py-4">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// a labelled setting row: description on the left, control on the right. keeps
// small controls from looking stranded in a big empty panel.
export function SettingRow({
  label,
  hint,
  muted,
  children,
}: {
  label: string;
  hint: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between [&:not(:last-child)]:border-b">
      <div className="space-y-0.5">
        <p className={cn("text-sm font-medium", muted && "text-muted-foreground")}>{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
