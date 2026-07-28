import { cn } from "@/lib/utils";

export function FreshnessDot({ lastUsedAt }: { lastUsedAt: string | Date | null }) {
  if (!lastUsedAt) {
    return <span className="inline-block size-1.5 rounded-full bg-muted-foreground/40" />;
  }
  const ms = Date.now() - new Date(lastUsedAt).getTime();
  const day = 24 * 60 * 60 * 1000;
  const tone = ms < day ? "bg-success" : ms < 30 * day ? "bg-warning" : "bg-muted-foreground/40";
  return <span className={cn("inline-block size-1.5 rounded-full", tone)} />;
}

export function timeAgo(d: string | Date | null): string {
  if (!d) return "Never";
  const ms = Date.now() - new Date(d).getTime();
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (ms < min) return "Just now";
  if (ms < hr) return `${Math.floor(ms / min)}m ago`;
  if (ms < day) return `${Math.floor(ms / hr)}h ago`;
  if (ms < 30 * day) return `${Math.floor(ms / day)}d ago`;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(d: string | Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
