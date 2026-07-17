"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

// only sign-in and sign-up are unreachable while signed in. verify-email,
// reset-password and accept-invite are all legitimately visited with a live
// session, so they must not be guarded.
const GUARDED = ["/sign-in", "/sign-up"];

// a signed-in user landing on sign-in/sign-up used to keep the old session while
// the form created a second account. the page then acted as the wrong identity
// (resend verification returned EMAIL_MISMATCH for the address on screen).
// send them to the app instead; /app resolves where they belong.
export function SignedInGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending || !session) return;
    if (!GUARDED.includes(pathname)) return;
    router.replace("/app");
  }, [isPending, session, pathname, router]);

  return null;
}
