"use client";

import { useEffect, useRef, useState } from "react";

/**
 * true only once `active` has held for `delay` ms, and then for at least
 * `minVisible` ms once shown.
 *
 * our queries return in 13-28ms. nielsen's limit for "reacting instantaneously"
 * is 100ms, so a skeleton for those is a flash of grey that reads as a glitch,
 * not as loading. the delay means a fast response shows nothing at all; the
 * floor means a response that lands just past the delay does not blink.
 *
 * see nngroup.com/articles/response-times-3-important-limits
 */
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
