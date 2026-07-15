"use client";

import { useMutation } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { SecretReveal } from "./secret-reveal";

type WebhookEvent = "run.completed" | "run.failed" | "batch.completed" | "credits.low";

// the events an endpoint can subscribe to. mirrors WEBHOOK_EVENTS in the router.
const EVENTS: { id: WebhookEvent; hint: string }[] = [
  { id: "run.completed", hint: "A conformance run finished" },
  { id: "run.failed", hint: "A run errored out" },
  { id: "batch.completed", hint: "A batch of runs finished" },
  { id: "credits.low", hint: "Balance dropped below your alert threshold" },
];

const DEFAULT_EVENTS: WebhookEvent[] = ["run.completed", "run.failed"];

export function CreateWebhookDialog({
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
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(DEFAULT_EVENTS);
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl("");
      setEvents(DEFAULT_EVENTS);
      setSecret(null);
    }
  }, [open]);

  const create = useMutation(
    trpc.developers.webhooks.create.mutationOptions({
      onSuccess: (res) => {
        setSecret(res.secret);
        onCreated();
      },
      onError: (e) => toast.error(e.message ?? "Could not create the endpoint."),
    }),
  );

  const toggleEvent = (id: WebhookEvent) => {
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const submit = () => {
    if (!url.trim()) {
      toast.error("Enter the endpoint URL.");
      return;
    }
    if (events.length === 0) {
      toast.error("Pick at least one event.");
      return;
    }
    create.mutate({ workspaceId, url: url.trim(), events });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {secret ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your signing secret</DialogTitle>
              <DialogDescription>
                Use this to verify the{" "}
                <code className="font-mono text-xs">X-FHIRfix-Signature</code> header on every
                delivery. It is shown once.
              </DialogDescription>
            </DialogHeader>

            <SecretReveal value={secret} label="Signing secret" />

            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>You will not be able to see this secret again after closing this dialog.</span>
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add webhook endpoint</DialogTitle>
              <DialogDescription>
                We POST a signed JSON payload to this URL for the events you pick.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wh-url">Endpoint URL</Label>
                <Input
                  id="wh-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/hooks/fhirfix"
                  autoFocus
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Events</Label>
                <div className="space-y-1.5">
                  {EVENTS.map((ev) => (
                    <label
                      key={ev.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={events.includes(ev.id)}
                        onChange={() => toggleEvent(ev.id)}
                        className="size-4 rounded border-input accent-[var(--interactive)]"
                      />
                      <span className="font-mono text-xs">{ev.id}</span>
                      <span className="ml-auto text-right text-[11px] text-muted-foreground">
                        {ev.hint}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={create.isPending}>
                {create.isPending ? "Adding..." : "Add endpoint"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
