import { useEffect, useRef, useState } from "react";

export function useLastPresent<T>(value: T | null, holdMs = 200): T | null {
  const [, force] = useState(0);
  const latest = useRef<T | null>(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (value !== null && value !== latest.current) {
    latest.current = value;
  }

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (value !== null) return;

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
