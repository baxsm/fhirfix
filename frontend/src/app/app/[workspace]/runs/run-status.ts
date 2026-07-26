import { describeFailure } from "@/components/report/run-failure";

export type Status = "queued" | "running" | "completed" | "failed";

// `run.cancel` stores status "failed" with "Cancelled by user.", so a run the
// user stopped on purpose looked identical to one that broke: red row, red dot,
// the word "failed", and it was counted in the Failed-only chip.
//
// these live outside the view so they can be tested without dragging in the
// auth/env import chain, and so the list and the report read the SAME mapper
// rather than drifting into disagreeing about what counts as a failure.
export function isCancelled(r: { status: Status; errorMessage: string | null }): boolean {
  return r.status === "failed" && describeFailure(r.errorMessage).kind === "cancelled";
}

export function isRealFailure(r: { status: Status; errorMessage: string | null }): boolean {
  return r.status === "failed" && !isCancelled(r);
}
