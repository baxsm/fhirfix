import { describeFailure } from "@/components/report/run-failure";

export type Status = "queued" | "running" | "completed" | "failed";

export function isCancelled(r: { status: Status; errorMessage: string | null }): boolean {
  return r.status === "failed" && describeFailure(r.errorMessage).kind === "cancelled";
}

export function isRealFailure(r: { status: Status; errorMessage: string | null }): boolean {
  return r.status === "failed" && !isCancelled(r);
}
