"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // avoid the server/client theme mismatch (code-style.md theme hydration).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme : undefined;

  return (
    <div className="inline-flex gap-1 rounded-md border p-1">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant={current === opt.value ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTheme(opt.value)}
          aria-pressed={current === opt.value}
        >
          <opt.icon className="size-4" />
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
