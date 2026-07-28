import { cn } from "@/lib/utils";

// no icon prop on purpose: a decorative glyph beside a heading that already
// names the section is the single biggest "generic dashboard" tell here
export function SettingsSection({
  title,
  description,
  actions,
  flush,
  children,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="raised flex h-full flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className={cn("flex-1", flush ? "" : "px-4 py-3.5")}>{children}</div>
    </section>
  );
}

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
    <div className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between [&:not(:last-child)]:border-b">
      <div className="min-w-0 space-y-0.5">
        <p className={cn("text-sm font-medium", muted && "text-muted-foreground")}>{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
