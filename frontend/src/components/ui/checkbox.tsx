"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * there was no checkbox primitive, so five dialogs each hand-rolled a native
 * <input type="checkbox"> with `accent-[var(--interactive)]`. --interactive is
 * the LINK/focus blue, and spending it on a checked state meant the api-key
 * dialog was the only blue surface in an otherwise greyscale product - it read
 * as a different app.
 *
 * checked is ink, matching the primary button, because a checked box and a
 * pressed primary are the same idea: a thing you have chosen. blue stays for
 * things you can follow; emerald stays for conformance.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 cursor-pointer rounded-[4px] border border-input bg-background shadow-[inset_0_1px_0_0_oklch(1_0_0/0.6)] outline-none transition-colors",
        "hover:border-foreground/30",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
