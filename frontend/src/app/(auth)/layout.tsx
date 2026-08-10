import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SignedInGuard } from "./signed-in-guard";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col bg-muted">
      <SignedInGuard />

      {/* one restrained light source behind the card, not a full-bleed wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, color-mix(in oklch, var(--brand) 16%, transparent), transparent 70%)",
        }}
      />

      <header className="relative px-6 py-5 sm:px-8">
        <Link href="/" aria-label="FHIRfix home">
          <BrandMark size="sm" />
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[26rem]">{children}</div>
      </main>

      <footer className="relative px-6 pb-8 text-center">
        <p className="font-mono text-[11px] text-muted-foreground">
          Protected health data stays encrypted.{" "}
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  );
}
