"use client";

import { FileScan, GitBranch, KeyRound, Layers } from "lucide-react";
import Link from "next/link";
import { CreateWorkspaceForm } from "./create-workspace-form";

// what a workspace actually holds, in the product's own terms. this is the
// context a first-run user needs, not decorative filler.
const HOLDS = [
  { icon: FileScan, label: "Runs", hint: "Every conformance check and its findings" },
  {
    icon: GitBranch,
    label: "Mapping registry",
    hint: "The authority and code mappings that drive auto-fixes",
  },
  {
    icon: KeyRound,
    label: "API keys",
    hint: "Validate, convert, and fix from CI or your own services",
  },
  { icon: Layers, label: "Members and billing", hint: "Roles, credits, and retention policy" },
];

// first-run onboarding. shown when the signed-in user has zero workspaces. it
// reuses the auth split-panel identity so onboarding reads as one continuous
// flow from sign-up - a context panel on the left, the create form on the right.
// no floating card in the void, no dot-grid / glow-orb slop.
export function NewWorkspaceView() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[3fr_2fr]">
      {/* context panel. deep canvas, one restrained top-left light wash, and a
          plain-language explanation of what a workspace is for. */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r bg-background p-10 lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle, oklch(0.696 0.15 163.225 / 0.10), transparent 70%)",
          }}
        />

        <Link
          href="/"
          className="relative flex w-fit items-center gap-2 font-mono text-sm font-semibold"
        >
          <span className="inline-block size-2.5 rounded-sm bg-primary" />
          FHIRfix
        </Link>

        <div className="relative max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              A workspace is where your conformance work lives.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Set one up per team, environment, or source system. Everything below is scoped to it,
              and you can create more later.
            </p>
          </div>

          <ul className="space-y-3">
            {HOLDS.map((item) => (
              <li key={item.label} className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground">
                  <item.icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="pt-1 font-mono text-xs text-muted-foreground/60">
            US Core 6.1.0 · FHIR R4 · Da Vinci PAS / PDex
          </p>
        </div>

        <div />
      </div>

      {/* form panel. same emerald seam glow as the auth shell so the two halves
          read as one surface. */}
      <div className="relative flex flex-col p-6 sm:p-10">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-px lg:block"
          style={{
            background:
              "linear-gradient(to bottom, transparent, oklch(0.696 0.15 163.225 / 0.35) 45%, transparent)",
          }}
        />

        <Link
          href="/"
          className="flex w-fit items-center gap-2 font-mono text-sm font-semibold lg:invisible"
        >
          <span className="inline-block size-2.5 rounded-sm bg-primary" />
          FHIRfix
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">Create your first workspace</h1>
              <p className="text-sm text-muted-foreground">
                Name it after your team or the system you are cleaning up. This takes a few seconds.
              </p>
            </div>
            <CreateWorkspaceForm layout="page" />
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
