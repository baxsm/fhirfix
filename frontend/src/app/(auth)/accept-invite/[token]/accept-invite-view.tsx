"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient, useSession } from "@/lib/auth-client";
import { AuthCard } from "../../auth-card";

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
    return <AuthCard title="Invitation" description="Checking this invitation..." />;
  }

  if (!session) {
    return (
      <AuthCard
        title="You have been invited"
        description="Sign in or create an account with the invited email to join this workspace."
      >
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <a href={`/sign-in?invite=${token}`}>Sign in</a>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <a href={`/sign-up?invite=${token}`}>Create account</a>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Join this workspace"
      description={
        <>
          Signed in as <span className="font-medium text-foreground">{session.user.email}</span>.
          Accept the invitation to join.
        </>
      }
    >
      <Button className="w-full" onClick={accept} disabled={working}>
        {working ? "Joining..." : "Accept invitation"}
      </Button>
    </AuthCard>
  );
}
