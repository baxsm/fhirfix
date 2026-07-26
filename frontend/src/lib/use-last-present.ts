import { useEffect, useRef, useState } from "react";

/**
 * keeps the last non-null value alive for a short while after it goes null.
 *
 * dialogs in this app are driven by a nullable target (`open={!!target}`), and
 * closing sets that target to null immediately. but radix keeps the dialog
 * mounted for the length of its exit animation, so for those ~120ms the dialog
 * is still on screen rendering `target?.foo` - which is now undefined. the box
 * visibly empties out and collapses before it fades, which reads as the content
 * vanishing rather than the dialog closing.
 *
 * holding the previous value across the exit means the dialog animates away
 * still showing what it was showing.
 *
 * the delay must be >= the exit animation in ui/dialog.tsx (120ms).
 */
export function useLastPresent<T>(value: T | null, holdMs = 200): T | null {
  const [, force] = useState(0);
  const latest = useRef<T | null>(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // a NEW value is adopted during render, not in an effect. adopting it in an
  // effect meant the first render after opening still returned the previous
  // held value (null on a fresh mount), so the dialog painted one frame with an
  // empty source value before filling in.
  if (value !== null && value !== latest.current) {
    latest.current = value;
  }

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (value !== null) return;

    // only the disappearance is deferred, so the dialog animates away still
    // showing what it was showing.
    timer.current = setTimeout(() => {
      latest.current = null;
      force((n) => n + 1);
    }, holdMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, holdMs]);

  return latest.current;
}
