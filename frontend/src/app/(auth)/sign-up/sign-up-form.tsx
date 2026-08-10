"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import { signUp } from "@/lib/auth-client";
import { env } from "@/lib/env";
import { AuthCard } from "../auth-card";
import { GoogleButton } from "../google-button";

const schema = z.object({
  name: z.string().min(1, "Enter your name").max(80),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(128),
});

type Values = z.infer<typeof schema>;

export function SignUpForm() {
  const router = useRouter();
  // stays true through navigation to prevent double-submit + nav races.
  const [pending, setPending] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setPending(true);
    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: `${window.location.origin}/app`,
    });
    if (error) {
      setPending(false);
      toast.error(error.message ?? "Could not create your account.");
      return;
    }
    toast.success("Account created. Check your email to verify.");
    router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <AuthCard
      title="Create your account"
      description="Start with free trial credits. No card required."
      footer={
        <>
          Already have an account?{" "}
          <a
            href="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </a>
        </>
      }
    >
      {env.NEXT_PUBLIC_GOOGLE_ENABLED && (
        <>
          <GoogleButton />
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Ada Lovelace" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email</FormLabel>
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
