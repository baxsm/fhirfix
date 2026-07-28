"use client";

import { Check, Copy, Link2, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ShareState = {
  token: string;
  redacted: boolean;
  expiresAt: string | Date | null;
  revokedAt: string | Date | null;
};

// the share link lives at the frontend /share/[token] route.
function shareUrl(token: string): string {
  if (typeof window !== "undefined") return `${window.location.origin}/share/${token}`;
  return `/share/${token}`;
}

export function ShareDialog({
  open,
  onOpenChange,
  workspaceId,
  runId,
  existing,
  client,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  runId: string;
  existing: ShareState | null;
  // the tRPC vanilla client, so we can chain the PHI-block -> redact retry.
  client: {
    run: {
      share: {
        mutate: (i: {
          workspaceId: string;
          runId: string;
          redact?: boolean;
        }) => Promise<{ token: string; redacted: boolean }>;
      };
      revokeShare: {
        mutate: (i: { workspaceId: string; token: string }) => Promise<{ revoked: boolean }>;
      };
    };
  };
  onChanged: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phiPrompt, setPhiPrompt] = useState(false);

  const activeShare = existing && !existing.revokedAt ? existing : null;

  const create = async (redact: boolean) => {
    setCreating(true);
    setPhiPrompt(false);
    try {
      const res = await client.run.share.mutate({ workspaceId, runId, redact });
      toast.success(res.redacted ? "Redacted share link created." : "Share link created.");
      onChanged();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create the link.";
      // the backend blocks un-redacted PHI with a PRECONDITION_FAILED message.
      if (/patient identifiers|redacted/i.test(msg)) {
        setPhiPrompt(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setCreating(false);
    }
  };

  const revoke = async () => {
    if (!activeShare) return;
    setCreating(true);
    try {
      await client.run.revokeShare.mutate({ workspaceId, token: activeShare.token });
      toast.success("Share link revoked.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke.");
    } finally {
      setCreating(false);
    }
  };

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(shareUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-8 items-center justify-center rounded-md border bg-interactive/10">
            <Link2 className="size-4 text-interactive" />
          </div>
          <DialogTitle>Share this report</DialogTitle>
          <DialogDescription>
            Anyone with the link sees a read-only report. No sign-in required. Revocable and
            expiring.
          </DialogDescription>
        </DialogHeader>

        {activeShare ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {shareUrl(activeShare.token)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => copy(activeShare.token)}>
                {copied ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
            {activeShare.redacted && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldAlert className="size-3.5" />
                Patient identifiers are redacted in the shared copy.
              </p>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={revoke}
                disabled={creating}
                className="text-destructive"
              >
                Revoke link
              </Button>
            </div>
          </div>
        ) : phiPrompt ? (
          <div className="space-y-3">
            <div className="flex gap-2 rounded-md border border-warning/30 bg-warning/5 p-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              <p className="text-sm text-muted-foreground">
                This report contains patient identifiers. A public link would expose them. Share a
                redacted copy instead, with names, contacts, and identifier values removed.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPhiPrompt(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => create(true)} disabled={creating}>
                {creating && <Loader2 className="size-3.5 animate-spin" />}
                Share redacted copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => create(false)} disabled={creating}>
              {creating && <Loader2 className="size-3.5 animate-spin" />}
              Create link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { shareUrl };
