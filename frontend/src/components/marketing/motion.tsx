"use client";

import { type ElementType, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Reveal system — intentionally CSS + IntersectionObserver, NOT JS-driven Motion.
// two reasons: (1) Motion's rAF animations pause when the tab is not visible, which
// can leave initial-opacity-0 content invisible until focus; (2) a reveal must never
// be able to hide content. here the resting state is fully VISIBLE; the .reveal class
// starts it shifted+faded, and .is-in adds the transition to visible once it scrolls
// into view. no JS / no observer support => content shows (the base state without
// .reveal is visible). reduced-motion is handled in globals.css.

function useInView<T extends Element>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: margin, threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margin]);

  return { ref, inView };
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  // stagger index — multiplies the base step for a sequenced reveal.
  index?: number;
};

// rise + fade in when it enters the viewport, once. resting state is visible.
export function Reveal({ children, className, as, index = 0 }: RevealProps) {
  const Comp = (as ?? "div") as ElementType;
  const { ref, inView } = useInView<HTMLElement>();

  return (
    <Comp
      ref={ref}
      className={cn("reveal", inView && "is-in", className)}
      style={index ? { transitionDelay: `${index * 80}ms` } : undefined}
    >
      {children}
    </Comp>
  );
}

// a group whose <Reveal index={i}> children stagger. this is just a layout wrapper;
// each child observes itself, so it works even if the group is already in view.
export function RevealGroup({
  children,
  className,
  as,
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const Comp = (as ?? "div") as ElementType;
  return <Comp className={className}>{children}</Comp>;
}
