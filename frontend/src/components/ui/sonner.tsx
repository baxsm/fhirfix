"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// richColors supplies its own per-type background/text/border variables, so the
// --normal-* set below must stay scoped to the default (typeless) toast. setting
// them on the container flattened every variant to the same popover surface,
// which is why success and error read identically before.
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // sonner applies `default` to EVERY toast, not just typeless ones, so
          // putting the popover surface here painted over richColors' green/red
          // (verified: data-rich-colors=true and --success-bg green, yet the
          // toast measured pure white). the typeless surface comes from the
          // --normal-* variables below instead, which richColors leaves alone.
          // the close button ships as a circle pinned to the top-left corner.
          // square it off, move it inside on the right, and let it inherit the
          // toast's own colour so it stays legible on every variant.
          closeButton:
            // position/colour here; the square corners and hover come from the
            // `[data-sonner-toast] [data-close-button]` rule in globals.css,
            // which is the only thing that outranks sonner's border-radius:50%.
            "!left-auto !right-2 !top-1/2 !-translate-y-1/2 !size-5 !border-transparent !bg-transparent !text-current [&>svg]:!size-3.5",
          toast: "!gap-2.5 !pr-9 !shadow-lg",
          title: "!text-xs !font-medium",
          description: "!text-xs !opacity-80",
          actionButton: "!text-xs",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
