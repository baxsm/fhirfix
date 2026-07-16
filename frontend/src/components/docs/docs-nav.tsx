"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Method = "GET" | "POST";

interface NavItem {
  label: string;
  // section id on the /docs page, or null for a separate route (playground).
  id: string | null;
  href: string;
  method?: Method;
}

// grouped section nav, resend-style. endpoint items carry a colored method pill
// (same vocabulary as the request-logs table) so the surface reads consistently.
const SECTIONS: { group: string; items: NavItem[] }[] = [
  {
    group: "Get started",
    items: [
      { label: "Introduction", id: "top", href: "/docs" },
      { label: "Authentication", id: "authentication", href: "/docs#authentication" },
      { label: "Quickstart", id: "quickstart", href: "/docs#quickstart" },
    ],
  },
  {
    group: "Endpoints",
    items: [
      { label: "Validate", id: "validate", href: "/docs#validate", method: "POST" },
      { label: "Fix", id: "fix", href: "/docs#fix", method: "POST" },
      { label: "Convert", id: "convert", href: "/docs#convert", method: "POST" },
      { label: "List runs", id: "runs", href: "/docs#runs", method: "GET" },
    ],
  },
  {
    group: "Reference",
    items: [
      { label: "Idempotency", id: "idempotency", href: "/docs#idempotency" },
      { label: "Webhooks", id: "webhooks", href: "/docs#webhooks" },
      { label: "Errors", id: "errors", href: "/docs#errors" },
    ],
  },
  {
    group: "Try it",
    items: [{ label: "Playground", id: null, href: "/docs/playground" }],
  },
];

const METHOD_TONE: Record<Method, string> = {
  GET: "text-emerald-400",
  POST: "text-interactive",
};

// the section ids scrollspy tracks, in document order. "top" is the intro header.
const SPY_IDS = SECTIONS.flatMap((s) => s.items.map((i) => i.id)).filter(
  (id): id is string => id != null && id !== "top",
);
const NO_SPY: string[] = [];

export function DocsNav() {
  const pathname = usePathname();
  const onDocsRoot = pathname === "/docs";
  const activeId = useScrollSpy(onDocsRoot ? SPY_IDS : NO_SPY);

  const handleClick = (e: React.MouseEvent, id: string | null) => {
    // smooth-scroll within the docs page; let real route links (playground) pass.
    if (!onDocsRoot || id == null) return;
    e.preventDefault();
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", "/docs");
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `/docs#${id}`);
    }
  };

  const isActive = (item: NavItem) => {
    if (!onDocsRoot) return item.href === pathname;
    if (item.id === "top") return activeId === "top";
    return item.id === activeId;
  };

  return (
    <nav className="space-y-6 text-sm">
      {SECTIONS.map((section) => (
        <div key={section.group} className="space-y-0.5">
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
            {section.group}
          </p>
          {section.items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleClick(e, item.id)}
                className={cn(
                  "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-200",
                  active
                    ? "bg-foreground/[0.07] font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* animated active bar: slides/fades in on the active item. */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-200",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                {item.method && (
                  <span
                    className={cn(
                      "w-8 shrink-0 font-mono text-[9px] font-semibold",
                      METHOD_TONE[item.method],
                    )}
                  >
                    {item.method}
                  </span>
                )}
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// tracks which section is currently in view. returns "top" when scrolled above
// the first tracked section, else the id of the section nearest the top of the
// viewport. uses scroll position (not just intersection ratio) so the active item
// is stable while scrolling through tall sections.
//
// the bottom clamp matters: the last section can never scroll to the marker (the
// page runs out first), so at max scroll we activate it outright. without this the
// tail sections are permanently unreachable and the nav lies about where you are.
function useScrollSpy(ids: string[]): string {
  const [activeId, setActiveId] = useState("top");

  useEffect(() => {
    if (ids.length === 0) return;

    const compute = () => {
      // sections use scroll-mt-24 (96px), so a clicked section lands with its top
      // at exactly 96. the marker sits just past that - land ON the boundary and
      // you are in the section, not still in the previous one.
      const marker = 100;
      if (window.scrollY < 40) {
        setActiveId("top");
        return;
      }

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll - window.scrollY <= 2) {
        const last = ids[ids.length - 1];
        if (last) setActiveId(last);
        return;
      }

      let current = "top";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= marker) current = id;
        else break;
      }
      setActiveId(current);
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [ids]);

  return activeId;
}
