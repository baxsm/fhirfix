"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export function AccountView() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in");
  }, [isPending, session, router]);

  const trpc = useTRPC();
  const accountQuery = useQuery(trpc.account.get.queryOptions());

  if (isPending || accountQuery.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <Link
          href="/app"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to app
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Your personal profile and password.</p>
      </div>

      <ProfileForm
        initialName={accountQuery.data?.name ?? ""}
        email={accountQuery.data?.email ?? ""}
      />
      <div className="border-t" />
      <PasswordForm />
    </div>
  );
}

function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const trpc = useTRPC();
  const [name, setName] = useState(initialName);
  useEffect(() => setName(initialName), [initialName]);

  const save = useMutation(
    trpc.account.updateProfile.mutationOptions({
      onSuccess: () => toast.success("Profile updated"),
      onError: (e) => toast.error(e.message ?? "Could not update your profile."),
    }),
  );

  return (
    <form
      className="max-w-md space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ name });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="acc-email">Email</Label>
        <Input id="acc-email" value={email} disabled className="font-mono" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-name">Name</Label>
        <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" disabled={save.isPending || !name}>
        {save.isPending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const trpc = useTRPC();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const change = useMutation(
    trpc.account.changePassword.mutationOptions({
      onSuccess: () => {
        toast.success("Password changed");
        setCurrent("");
        setNext("");
      },
      onError: (e) => toast.error(e.message ?? "Could not change your password."),
    }),
  );

  return (
    <form
      className="max-w-md space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        change.mutate({ currentPassword: current, newPassword: next });
      }}
    >
      <h2 className="text-sm font-medium">Change password</h2>
      <div className="space-y-1.5">
        <Label htmlFor="cur-pw">Current password</Label>
        <Input
          id="cur-pw"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-pw">New password</Label>
        <Input
          id="new-pw"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={change.isPending || !current || next.length < 8}>
        {change.isPending ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}
