"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/trpc/client";

export function Providers({ children }: { children: React.ReactNode }) {
  // light-only on purpose: there is no theme toggle and nothing sets .dark.
  // the provider stays because sonner and the polar embed read a theme.
  return (
    <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
      <TRPCReactProvider>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </TRPCReactProvider>
      {/* bottom-right: a toast top-right sat under the topbar actions and covered the New check */}
      <Toaster richColors closeButton position="bottom-right" />
    </ThemeProvider>
  );
}
