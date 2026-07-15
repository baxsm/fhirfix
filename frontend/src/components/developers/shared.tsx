import { cn } from "@/lib/utils";

// last-used freshness dot, resend-style: green if used in the last 24h, amber
// within 30 days, neutral if older, muted-red-less if never used. this is a
// glanceable "is this key alive" signal in the table.
export function FreshnessDot({ lastUsedAt }: { lastUsedAt: string | Date | null }) {
  if (!lastUsedAt) {
    return <span className="inline-block size-1.5 rounded-full bg-muted-foreground/40" />;
  }
  const ms = Date.now() - new Date(lastUsedAt).getTime();
  const day = 24 * 60 * 60 * 1000;
  const tone =
    ms < day ? "bg-emerald-500" : ms < 30 * day ? "bg-warning" : "bg-muted-foreground/40";
  return <span className={cn("inline-block size-1.5 rounded-full", tone)} />;
}

// relative "time ago" for last-used / last-delivery. keeps the table scannable
// without a full timestamp; the exact time lives in a title attribute.
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
