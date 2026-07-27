"use client";

import { useEffect, useRef, useState } from "react";

export function useDelayedFlag(active: boolean, delay = 250, minVisible = 400) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      if (visible) return;
      const t = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, delay);
      return () => clearTimeout(t);
    }

    if (!visible) return;
    const elapsed = shownAt.current ? Date.now() - shownAt.current : minVisible;
    const remaining = Math.max(0, minVisible - elapsed);
    const t = setTimeout(() => {
      shownAt.current = null;
      setVisible(false);
    }, remaining);
    return () => clearTimeout(t);
  }, [active, visible, delay, minVisible]);

  return visible;
}
