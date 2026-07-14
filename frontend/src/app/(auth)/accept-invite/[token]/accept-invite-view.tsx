"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient, useSession } from "@/lib/auth-client";

export function AcceptInviteView({ token }: { token: string }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [working, setWorking] = useState(false);

  async function accept() {
    setWorking(true);
    const { error } = await authClient.organization.acceptInvitation({ invitationId: token });
    if (error) {
      setWorking(false);
      toast.error(error.message ?? "This invitation is invalid or has expired.");
      return;
    }
    toast.success("You joined the workspace.");
    router.push("/app");
  }

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading invitation...</p>;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">You have been invited</h1>
        <p className="text-sm text-muted-foreground">
          Sign in or create an account with the invited email to join this workspace.
        </p>
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <a href={`/sign-in?invite=${token}`}>Sign in</a>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <a href={`/sign-up?invite=${token}`}>Create account</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Join this workspace</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{session.user.email}</span>.
        Accept the invitation to join.
      </p>
      <Button className="w-full" onClick={accept} disabled={working}>
        {working ? "Joining..." : "Accept invitation"}
      </Button>
    </div>
  );
}
