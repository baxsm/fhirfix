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
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/env";
import { AuthCard } from "../auth-card";

const requestSchema = z.object({ email: z.email("Enter a valid email") });
const resetSchema = z.object({ password: z.string().min(8, "At least 8 characters").max(128) });

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  return token ? <SetNewPassword token={token} /> : <RequestReset />;
}

function RequestReset() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof requestSchema>) {
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${env.NEXT_PUBLIC_API_URL.replace(":3001", ":3000")}/reset-password`,
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not send the reset email.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        description="If an account exists for that address, a reset link is on its way. The link expires soon."
        footer={
          <a
            href="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </a>
        }
      />
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we will send a reset link."
      footer={
        <a
          href="/sign-in"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </a>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}

function SetNewPassword({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: values.password, token });
    if (error) {
      setPending(false);
      toast.error(error.message ?? "Could not reset your password. The link may have expired.");
      return;
    }
    toast.success("Password updated. Sign in with your new password.");
    router.push("/sign-in");
  }

  return (
    <AuthCard title="Set a new password" description="Choose a password you have not used before.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Updating..." : "Update password"}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
