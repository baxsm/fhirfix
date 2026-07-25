"use client";

import { Users2 } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * a user's picture, or a stand-in when they have not uploaded one.
 *
 * deliberately GREYSCALE. globals.css states the rule: "because chrome carries
 * NO hue, every saturated pixel on screen belongs to a finding", and "brand =
 * the violet dot in the wordmark. logo only, never chrome." an avatar in the
 * topbar is chrome, so a violet one both broke the brand rule and spent a
 * saturated pixel on something that says nothing about conformance.
 *
 * no generated marble either: it produced a different colour per user, which is
 * the same problem multiplied across a members list.
 */
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
        "flex shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Users2 style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.75} />
    </span>
  );
}
