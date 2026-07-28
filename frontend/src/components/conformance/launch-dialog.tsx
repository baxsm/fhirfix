"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterPill } from "@/components/ui/segmented";
import { useTRPC } from "@/trpc/client";

type AuthMode = "none" | "backend_services" | "token";

interface LaunchAuth {
  auth_type: "public" | "symmetric" | "asymmetric" | "backend_services";
  token_url?: string;
  client_id?: string;
  requested_scopes?: string;
  access_token?: string;
}

export function LaunchDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const kitsQuery = useQuery({
    ...trpc.conformance.kits.queryOptions({ workspaceId }),
    enabled: !!workspaceId && open,
  });

  const [selected, setSelected] = useState<string[]>(["plan_net"]);
  const [endpoint, setEndpoint] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [tokenUrl, setTokenUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [scopes, setScopes] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const launch = useMutation(
    trpc.conformance.launch.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.conformance.list.queryKey({ workspaceId }),
        });
        toast.success("Packet queued");
        onOpenChange(false);
        setEndpoint("");
        setAccessToken("");
      },
      onError: (error) => toast.error(error.message || "Could not launch the packet"),
    }),
  );

  const runnable = (kitsQuery.data ?? []).filter((kit) => !kit.attended);
  const attended = (kitsQuery.data ?? []).filter((kit) => kit.attended);
  const authReady =
    authMode === "none" ||
    (authMode === "backend_services" && !!tokenUrl.trim() && !!clientId.trim()) ||
    (authMode === "token" && !!accessToken.trim());
  const canSubmit =
    endpoint.trim().length > 0 && selected.length > 0 && authReady && !launch.isPending;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  }

  function submit() {
    let auth: LaunchAuth | undefined;
    if (authMode === "backend_services") {
      auth = {
        auth_type: "backend_services",
        token_url: tokenUrl.trim(),
        client_id: clientId.trim(),
        requested_scopes: scopes.trim() || undefined,
      };
    } else if (authMode === "token") {
      auth = { auth_type: "symmetric", access_token: accessToken.trim() };
    }
    launch.mutate({ workspaceId, testKits: selected, targetEndpoint: endpoint.trim(), auth });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New conformance packet</DialogTitle>
          <DialogDescription>
            Run the Inferno test kits against a live FHIR endpoint and archive the evidence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="endpoint">FHIR endpoint</Label>
            <Input
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://payer.example.com/fhir"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Test kits</legend>
            {runnable.map((kit) => (
              <div
                key={kit.id}
                className="flex items-start gap-2.5 rounded-md border border-border px-3 py-2"
              >
                <Checkbox
                  id={`kit-${kit.id}`}
                  checked={selected.includes(kit.id)}
                  onCheckedChange={() => toggle(kit.id)}
                  className="mt-0.5"
                />
                <Label htmlFor={`kit-${kit.id}`} className="min-w-0 cursor-pointer font-normal">
                  <span className="block text-sm">{kit.label}</span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    IG {kit.igVersion} · kit {kit.kitVersion}
                  </span>
                </Label>
              </div>
            ))}

            {attended.map((kit) => (
              <div
                key={kit.id}
                className="flex items-start gap-2.5 rounded-md border border-dashed border-border px-3 py-2 opacity-70"
              >
                <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm text-muted-foreground">{kit.label}</span>
                  <span className="block text-[11px] leading-relaxed text-muted-foreground">
                    {kit.attendedReason}
                  </span>
                </span>
              </div>
            ))}
          </fieldset>

          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-sm font-medium">Authorization</p>
            <div className="flex flex-wrap gap-1.5">
              <FilterPill active={authMode === "none"} onClick={() => setAuthMode("none")}>
                Open endpoint
              </FilterPill>
              <FilterPill
                active={authMode === "backend_services"}
                onClick={() => setAuthMode("backend_services")}
              >
                SMART Backend Services
              </FilterPill>
              <FilterPill active={authMode === "token"} onClick={() => setAuthMode("token")}>
                Access token
              </FilterPill>
            </div>

            {authMode === "backend_services" && (
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <Input
                  value={tokenUrl}
                  onChange={(e) => setTokenUrl(e.target.value)}
                  placeholder="Token URL"
                />
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Client ID"
                />
                <Input
                  className="sm:col-span-2"
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                  placeholder="system/*.read"
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground sm:col-span-2">
                  Register Inferno&apos;s public JWKS with the payer first.
                </p>
              </div>
            )}

            {authMode === "token" && (
              <div className="pt-1">
                <Input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Access token"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {launch.isPending ? "Launching..." : "Launch packet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
