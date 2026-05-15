import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-card/70 backdrop-blur-sm px-3 py-2 text-sm shadow-[inset_0_1px_0_oklch(1_0_0_/_0.7),0_1px_0_oklch(0_0_0_/_0.02)] transition-all outline-none placeholder:text-muted-foreground/55 hover:border-foreground/15 focus-visible:border-primary/60 focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-50 aria-invalid:border-destructive/60 aria-invalid:ring-4 aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
