"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingRow } from "@/components/dashboard/settings-section";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";
import { useTRPC } from "@/trpc/client";

// the two values an admin pastes into their IdP. derived from the api url so a
// deployed workspace shows its own host, never a hardcoded localhost.
function spUrls(providerId: string) {
  const base = `${env.NEXT_PUBLIC_API_URL}/api/auth/sso`;
  return {
    acs: `${base}/saml2/callback/${providerId}`,
    entityId: `${base}/saml2/sp/metadata`,
  };
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-2 py-1.5 font-mono text-xs">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function SsoSection({ workspaceId, isOwner }: { workspaceId: string; isOwner: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const ssoQuery = useQuery({
    ...trpc.workspace.ssoGet.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });
  const summaryQuery = useQuery({
    ...trpc.billing.summary.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const plan = summaryQuery.data?.plan;
  // an unread plan counts as premium so the gate never flashes over a paying
  // workspace while billing is still loading. same rule as the packets screen.
  const isPremium = plan == null || plan.tier === "premium";

  const [manual, setManual] = useState(false);
  const [domain, setDomain] = useState("");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [issuer, setIssuer] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [cert, setCert] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.workspace.ssoGet.queryKey({ workspaceId }) });

  const save = useMutation(
    trpc.workspace.ssoUpsert.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Single sign-on is configured.");
      },
      onError: (e) => toast.error(e.message ?? "Could not save the provider."),
    }),
  );

  const remove = useMutation(
    trpc.workspace.ssoDelete.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Single sign-on removed.");
      },
      onError: (e) => toast.error(e.message ?? "Could not remove the provider."),
    }),
  );

  const upgrade = useMutation(
    trpc.billing.upgradeToPremium.mutationOptions({
      onSuccess: ({ url }) => {
        window.location.href = url;
      },
      onError: (e) => toast.error(e.message ?? "Could not start checkout."),
    }),
  );

  if (ssoQuery.isPending) return <Skeleton className="h-40 w-full" />;

  // the deployment has SSO switched off entirely. saying so is more honest than
  // rendering a form whose save can only fail.
  if (ssoQuery.data?.enabled === false) {
    return (
      <SettingRow
        label="Single sign-on"
        hint="Not enabled on this deployment. Contact your administrator."
        muted
      >
        <span className="text-xs text-muted-foreground">Unavailable</span>
      </SettingRow>
    );
  }

  const provider = ssoQuery.data?.provider ?? null;

  if (!isPremium) {
    return (
      <EmptyState
        icon={KeyRound}
        title="Single sign-on is part of Premium"
        body={`Let your team sign in through your own identity provider over SAML. ${plan?.premiumLabel ?? ""} per month.`}
        action={
          plan?.purchasable ? (
            <Button
              size="sm"
              disabled={upgrade.isPending}
              onClick={() => upgrade.mutate({ workspaceId })}
            >
              {upgrade.isPending ? "Opening checkout..." : `Upgrade for ${plan.premiumLabel}/mo`}
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (provider) {
    const urls = spUrls(provider.providerId);
    return (
      <>
        <SettingRow label="Identity provider" hint="Members with this email domain sign in here.">
          <span className="font-mono text-xs">{provider.domain}</span>
        </SettingRow>
        <SettingRow label="Issuer" hint="The entity ID your provider asserts.">
          <span className="max-w-[22rem] truncate font-mono text-xs">{provider.issuer}</span>
        </SettingRow>
        {/* 95 chars of hex. SettingRow's value slot is shrink-0, so a string
            this long overflows the row instead of truncating. it gets its own
            block and wraps. */}
        {provider.certFingerprint && (
          <div className="space-y-1 border-t py-3.5">
            <p className="text-sm font-medium">Certificate</p>
            <p className="text-xs text-muted-foreground">
              Compare this against the signing certificate shown by your provider.
            </p>
            <p className="break-all pt-1 font-mono text-[11px] leading-relaxed">
              {provider.certFingerprint}
            </p>
          </div>
        )}
        <div className="space-y-3 border-t pt-3.5">
          <CopyRow label="Sign-on URL (ACS)" value={urls.acs} />
          <CopyRow label="Audience (SP entity ID)" value={urls.entityId} />
        </div>
        <div className="flex justify-end border-t pt-3.5">
          <Button
            variant="destructive"
            size="sm"
            disabled={!isOwner || remove.isPending}
            onClick={() => remove.mutate({ workspaceId })}
          >
            {remove.isPending ? "Removing..." : "Remove"}
          </Button>
        </div>
        {!isOwner && (
          <p className="pt-2 text-xs text-muted-foreground">Only an owner can change this.</p>
        )}
      </>
    );
  }

  const urls = spUrls(`ws-${workspaceId}`);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          workspaceId,
          domain,
          ...(manual ? { issuer, entryPoint, cert } : { metadataUrl }),
        });
      }}
      noValidate
      className="space-y-4"
    >
      <p className="text-xs text-muted-foreground">
        Add these two values to your identity provider first, then enter its details below.
      </p>
      <div className="space-y-3">
        <CopyRow label="Sign-on URL (ACS)" value={urls.acs} />
        <CopyRow label="Audience (SP entity ID)" value={urls.entityId} />
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <Label htmlFor="sso-domain">Email domain</Label>
        <Input
          id="sso-domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="yourcompany.com"
          autoComplete="off"
          className="font-mono"
          disabled={!isOwner}
        />
        <p className="text-xs text-muted-foreground">
          Members with this domain are sent to your provider to sign in.
        </p>
      </div>

      {manual ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sso-issuer">Issuer / entity ID</Label>
            <Input
              id="sso-issuer"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              autoComplete="off"
              className="font-mono"
              disabled={!isOwner}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sso-entry">Sign-on URL</Label>
            <Input
              id="sso-entry"
              value={entryPoint}
              onChange={(e) => setEntryPoint(e.target.value)}
              autoComplete="off"
              className="font-mono"
              disabled={!isOwner}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sso-cert">Signing certificate</Label>
            <textarea
              id="sso-cert"
              value={cert}
              onChange={(e) => setCert(e.target.value)}
              rows={4}
              disabled={!isOwner}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="sso-metadata">Metadata URL</Label>
          <Input
            id="sso-metadata"
            value={metadataUrl}
            onChange={(e) => setMetadataUrl(e.target.value)}
            placeholder="https://your-idp.example.com/.../metadata"
            autoComplete="off"
            className="font-mono"
            disabled={!isOwner}
          />
          <p className="text-xs text-muted-foreground">
            We read the issuer, sign-on URL and certificate from it.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <button
          type="button"
          onClick={() => setManual((m) => !m)}
          className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {manual ? "Use a metadata URL" : "Enter details manually"}
        </button>
        <Button type="submit" size="sm" disabled={!isOwner || save.isPending}>
          {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
      {!isOwner && (
        <p className="text-xs text-muted-foreground">Only an owner can configure single sign-on.</p>
      )}
    </form>
  );
}
