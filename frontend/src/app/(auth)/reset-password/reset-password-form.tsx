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
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for that address, a reset link is on its way. The link expires soon.
        </p>
        <a href="/sign-in" className="text-sm font-medium underline-offset-4 hover:underline">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we will send a reset link.
        </p>
      </div>
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
      <a
        href="/sign-in"
        className="block text-center text-sm text-muted-foreground hover:underline"
      >
        Back to sign in
      </a>
    </div>
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
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-sm text-muted-foreground">Choose a password you have not used before.</p>
      </div>
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
    </div>
  );
}
