import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AuthHero } from "./auth-hero";
import { SignedInGuard } from "./signed-in-guard";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[3fr_2fr]">
      <SignedInGuard />
      <AuthHero />

      {/* form panel. a faint emerald seam glow runs down the divider so the two halves read as one */}
      <div className="relative flex flex-col p-6 sm:p-10">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-px lg:block"
          style={{
            background:
              "linear-gradient(to bottom, transparent, oklch(0.696 0.15 163.225 / 0.35) 45%, transparent)",
          }}
        />

        {/* top row: mobile brand mark + a quiet docs link (fills the corner without a corporate trust */}
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:invisible">
            <BrandMark size="sm" />
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
            <ArrowUpRight className="size-3" />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        {/* /terms and /privacy are placeholders until phase 8, but they resolve rather than 404 */}
        <p className="text-center font-mono text-[11px] text-muted-foreground/60">
          Protected health data stays encrypted. By continuing you agree to the{" "}
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
