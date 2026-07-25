"use client";

import BoringAvatar from "boring-avatars";
import { UserRound } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * a user's picture, or a generated stand-in when they have not uploaded one.
 *
 * this is built the way clerk builds theirs: a `boring-avatars` (MIT) marble
 * background - the same library clerk uses - with a silhouette composited on
 * top. the library only draws backgrounds; it has no silhouette or initials
 * option, so the foreground is lucide's `UserRound`, filled. nothing here is
 * hand-drawn.
 *
 * the marble is deterministic per user and renders locally, no external request.
 */

// violet brand first so the mark reads as ours, with two supporting tones. the
// palette is deliberately tight: a wide palette turns a list of members into
// confetti.
const PALETTE = ["#7c5cff", "#6b4de6", "#9d85ff", "#5b3fd1", "#b9a6ff"];

export function UserAvatar({
  name,
  email,
  src,
  size = 32,
  className,
}: {
  name: string;
  email: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  // seed on the email: stable and unique, and it does not change when someone
  // edits their display name.
  const seed = email || name || "user";

  if (src) {
    return (
      <Avatar className={cn("shrink-0", className)} style={{ width: size, height: size }}>
        <AvatarImage src={src} alt="" />
      </Avatar>
    );
  }

  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <BoringAvatar size={size} name={seed} variant="marble" colors={PALETTE} square />
      <UserRound
        className="absolute inset-0 m-auto text-white"
        strokeWidth={0}
        fill="currentColor"
        style={{ width: size * 0.52, height: size * 0.52 }}
      />
    </span>
  );
}
