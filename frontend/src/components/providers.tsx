"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/trpc/client";

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
