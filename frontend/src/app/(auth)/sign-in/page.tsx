import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  // SignInForm reads useSearchParams (the post-sign-in redirect target), which
  // bails out of prerendering unless it sits under a suspense boundary. without
  // this the production build FAILS on this route - dev mode does not surface
  // it. the sibling reset-password and verify-email pages already do this.
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
