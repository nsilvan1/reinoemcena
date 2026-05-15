import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-card/70 backdrop-blur-sm px-3 py-1.5 text-sm shadow-[inset_0_1px_0_oklch(1_0_0_/_0.7),0_1px_0_oklch(0_0_0_/_0.02)] transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/55 hover:border-foreground/15 focus-visible:border-primary/60 focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:shadow-[inset_0_1px_0_oklch(1_0_0_/_0.7),0_0_0_4px_oklch(0.44_0.10_158_/_0.15)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-50 aria-invalid:border-destructive/60 aria-invalid:ring-4 aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Input }
