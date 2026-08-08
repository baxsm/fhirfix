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
        // must be absolute and read on click: the callback resolves against the backend origin
        const origin = window.location.origin;
        const callbackURL = next?.startsWith("/app") ? `${origin}${next}` : `${origin}/app`;
        const { error } = await signIn.social({ provider: "google", callbackURL });
        // only a failure returns here; success is already navigating away
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
