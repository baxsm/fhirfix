"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function VerifyEmailView() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [pending, setPending] = useState(false);

  async function resend() {
    if (!email) {
      toast.error("No email on file to resend to. Sign in to try again.");
      return;
    }
    setPending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/app`,
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not resend the verification email.");
      return;
    }
    toast.success("Verification email sent.");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Verify your email</h1>
        <p className="text-sm text-muted-foreground">
          {email ? (
            <>
              We sent a verification link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Open it to activate your
              account.
            </>
          ) : (
            "We sent you a verification link. Open it to activate your account."
          )}
        </p>
      </div>
      <Button variant="outline" className="w-full" onClick={resend} disabled={pending}>
        {pending ? "Sending..." : "Resend verification email"}
      </Button>
      <a
        href="/sign-in"
        className="block text-center text-sm text-muted-foreground hover:underline"
      >
        Back to sign in
      </a>
    </div>
  );
}
