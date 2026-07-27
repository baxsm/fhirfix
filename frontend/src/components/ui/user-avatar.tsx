"use client";

import { Users2 } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  src,
  size = 32,
  className,
}: {
  name?: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <Avatar className={cn("shrink-0", className)} style={{ width: size, height: size }}>
        <AvatarImage src={src} alt={name ? `${name}'s profile picture` : ""} />
      </Avatar>
    );
  }

  return (
    <span
      className={cn(
        "field-surface flex shrink-0 items-center justify-center rounded-full border text-muted-foreground",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Users2 style={{ width: size * 0.46, height: size * 0.46 }} strokeWidth={1.75} />
    </span>
  );
}
