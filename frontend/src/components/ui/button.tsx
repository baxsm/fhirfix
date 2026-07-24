import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      // these are different MATERIALS, not one shape in six colours. the old set
      // was `bg-{colour} + hover:bg-{colour}/90` six times over, which is why
      // every button read as the same object wearing a different hat. each
      // variant below differs in fill weight, border, and shadow.
      variant: {
        // solid ink. the single primary action on a screen. the inset light edge
        // + drop shadow make it read as a raised physical key, not a flat block.
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.16),0_1px_2px_0_oklch(0.145_0_0/0.28)] hover:bg-[color-mix(in_oklch,var(--primary),white_10%)]",
        // heavier still, and green, RESERVED for "make it conformant" - the
        // product's promise. never a generic primary.
        success:
          "bg-success text-success-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.22),0_1px_2px_0_oklch(0.35_0.09_163/0.32)] hover:bg-[color-mix(in_oklch,var(--success),white_8%)]",
        // a hairline that only gains contrast on hover. no fill at rest, so it
        // never competes with the primary.
        outline: "border-border bg-card hover:border-ring hover:bg-muted/60",
        // a REAL mid-grey fill (secondary is 0.831, not a whisper). this is the
        // second-most-important action: obviously a button, obviously not first.
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)]",
        // no box at all until hover. for tertiary actions inside dense rows.
        ghost: "hover:bg-accent hover:text-accent-foreground",
        // outline-only until hover, so destruction is never the loudest thing
        // on the screen.
        destructive:
          "border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/[0.06] focus-visible:border-destructive/50 focus-visible:ring-destructive/20",
        link: "text-interactive underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
