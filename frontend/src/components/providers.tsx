"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/trpc/client";

// the dark token set is kept and still works, but the product ships light: it
// is the right read for a fintech-adjacent tool, and it is the surface we
// actually design and QA against. forcedTheme (rather than defaultTheme) means
// no persisted choice can override it, which is why there is no toggle in the
// ui - a control that cannot change anything is worse than no control.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
      <TRPCReactProvider>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </TRPCReactProvider>
      {/* bottom-right: a toast top-right sat under the topbar actions and covered
          the New check button while it was showing. */}
      <Toaster richColors closeButton position="bottom-right" />
    </ThemeProvider>
  );
}
