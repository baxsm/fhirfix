"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

const GUARDED = ["/sign-in", "/sign-up"];

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
