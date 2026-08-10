"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient, signIn } from "@/lib/auth-client";
import { env } from "@/lib/env";
import { AuthCard } from "../auth-card";
import { GoogleButton } from "../google-button";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type Values = z.infer<typeof schema>;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setPending(true);
    const { error } = await signIn.email({ email: values.email, password: values.password });
    if (error) {
      setPending(false);
      if (error.status === 403) {
        toast.error("Verify your email before signing in.");
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      toast.error(error.message ?? "Could not sign in.");
      return;
    }
    const next = searchParams.get("next");
    if (next?.startsWith("/app")) {
      router.replace(next);
      return;
    }

    const { data: orgs } = await authClient.organization.list();
    const slug = orgs?.[0]?.slug;
    router.replace(slug ? `/app/${slug}` : "/app/new");
  }

  return (
    <AuthCard
      title="Sign in"
      description="Pick up where you left off."
      footer={
        <>
          New to FHIRfix?{" "}
          <a
            href="/sign-up"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </a>
        </>
      }
    >
      {env.NEXT_PUBLIC_GOOGLE_ENABLED && (
        <>
          <GoogleButton next={searchParams.get("next")} />
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <a
                    href="/reset-password"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
