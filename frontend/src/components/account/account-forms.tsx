"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";

export function ProfileForm({
  initialName,
  email,
  onDone,
}: {
  initialName: string;
  email: string;
  onDone?: () => void;
}) {
  const trpc = useTRPC();
  const [name, setName] = useState(initialName);
  useEffect(() => setName(initialName), [initialName]);

  const save = useMutation(
    trpc.account.updateProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Profile updated");
        onDone?.();
      },
      onError: (e) => toast.error(e.message ?? "Could not update your profile."),
    }),
  );

  return (
    <form
      className="space-y-3.5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ name });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="acc-name">Name</Label>
        <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-email">Email</Label>
        <Input id="acc-email" value={email} disabled className="font-mono" />
        <p className="text-xs text-muted-foreground">
          The address you sign in with. Contact support to change it.
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending || !name || name === initialName}>
          {save.isPending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm({ onDone }: { onDone?: () => void }) {
  const trpc = useTRPC();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const change = useMutation(
    trpc.account.changePassword.mutationOptions({
      onSuccess: () => {
        toast.success("Password changed");
        setCurrent("");
        setNext("");
        onDone?.();
      },
      onError: (e) => toast.error(e.message ?? "Could not change your password."),
    }),
  );

  return (
    <form
      className="space-y-3.5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        change.mutate({ currentPassword: current, newPassword: next });
      }}
    >
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
        {/* the requirement is stated up front rather than only on rejection. */}
        <p className="text-xs text-muted-foreground">
          At least 8 characters.
          {next.length > 0 && next.length < 8 && (
            <span className="text-destructive"> {8 - next.length} more to go.</span>
          )}
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={change.isPending || !current || next.length < 8}>
          {change.isPending ? "Updating..." : "Change password"}
        </Button>
      </div>
    </form>
  );
}
