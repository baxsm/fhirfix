"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/trpc/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TRPCReactProvider>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </TRPCReactProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
