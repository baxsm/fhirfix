"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InlineNote } from "@/components/ui/inline-note";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { SecretReveal } from "./secret-reveal";

type KeyMode = "test" | "live";

// the scopes a key can hold. mirrors KEY_SCOPES in the developers router.
const SCOPES: { id: string; label: string; hint: string }[] = [
  { id: "validate", label: "validate", hint: "Run conformance checks" },
  { id: "fix", label: "fix", hint: "Apply safe autofixes" },
  { id: "convert", label: "convert", hint: "Convert HL7v2 / C-CDA" },
  { id: "runs", label: "runs", hint: "Read run history + reports" },
  { id: "mappings", label: "mappings", hint: "Write mappings (admin)" },
];

const DEFAULT_SCOPES = ["validate", "fix", "convert"];

export function CreateKeyDialog({
  workspaceId,
  open,
  onOpenChange,
  onCreated,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const trpc = useTRPC();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<KeyMode>("test");
  const [scopes, setScopes] = useState<string[]>(DEFAULT_SCOPES);
  const [created, setCreated] = useState<{ key: string; mode: KeyMode } | null>(null);

  // reset the form each time the dialog is freshly opened.
  useEffect(() => {
    if (open) {
      setName("");
      setMode("test");
      setScopes(DEFAULT_SCOPES);
      setCreated(null);
    }
  }, [open]);

  const create = useMutation(
    trpc.developers.apiKeys.create.mutationOptions({
      onSuccess: (res) => {
        setCreated({ key: res.key, mode: res.mode });
        onCreated();
      },
      onError: (e) => toast.error(e.message ?? "Could not create the key."),
    }),
  );

  const toggleScope = (id: string) => {
    setScopes((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give the key a name.");
      return;
    }
    if (scopes.length === 0) {
      toast.error("Pick at least one scope.");
      return;
    }
    create.mutate({
      workspaceId,
      name: name.trim(),
      mode,
      scopes: scopes as ("validate" | "fix" | "convert" | "runs" | "mappings")[],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your {created.mode} key</DialogTitle>
              <DialogDescription>
                This is the only time the full key is shown. Store it somewhere safe. If you lose
                it, revoke it and make a new one.
              </DialogDescription>
            </DialogHeader>

            <SecretReveal value={created.key} label="Secret key" />

            <InlineNote>Copy it now. You will not be able to see this key again.</InlineNote>

            <DialogFooter>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                A key authenticates REST requests to the FHIRfix API.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="CI pipeline"
                  maxLength={80}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label>Mode</Label>
                <div role="radiogroup" aria-label="Key mode" className="grid grid-cols-2 gap-2">
                  <ModeButton
                    active={mode === "test"}
                    onClick={() => setMode("test")}
                    title="Test"
                    hint="Free to run"
                  />
                  <ModeButton
                    active={mode === "live"}
                    onClick={() => setMode("live")}
                    title="Live"
                    hint="Spends credits"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Scopes</Label>
                <div className="space-y-1.5">
                  {SCOPES.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                    >
                      <Checkbox
                        id={`scope-${s.id}`}
                        checked={scopes.includes(s.id)}
                        onCheckedChange={() => toggleScope(s.id)}
                      />
                      <Label
                        htmlFor={`scope-${s.id}`}
                        className="flex flex-1 cursor-pointer items-center gap-2.5 font-normal"
                      >
                        <span className="font-mono text-xs">{s.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{s.hint}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={create.isPending}>
                {create.isPending ? "Creating..." : "Create key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a card this size cannot be an <input type="radio">
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors",
        active
          ? "border-foreground/25 bg-muted"
          : "border-border hover:border-foreground/20 hover:bg-muted/40",
      )}
    >
      {/* an explicit dot, because a fill alone is ambiguous when the two options sit side by side - */}
      <span
        className={cn(
          "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
          active ? "border-primary bg-primary" : "border-input bg-background",
        )}
      >
        {active && <span className="size-1.5 rounded-full bg-primary-foreground" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
