"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { GoogleMark } from "./google-mark";

export function GoogleButton({ next }: { next?: string | null }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        // read on click, not during render: window does not exist during SSR.
        // the callback lands on the backend, which then sends the browser here,
        // so a relative path would resolve against the backend origin.
        const origin = window.location.origin;
        const callbackURL = next?.startsWith("/app") ? `${origin}${next}` : `${origin}/app`;
        const { error } = await signIn.social({ provider: "google", callbackURL });
        // on success the browser is already navigating away, so only a failure
        // returns here and needs the button back.
        if (error) {
          setPending(false);
          toast.error(error.message ?? "Could not sign in with Google.");
        }
      }}
    >
      <GoogleMark className="size-4" />
      {pending ? "Redirecting..." : "Continue with Google"}
    </Button>
  );
}
