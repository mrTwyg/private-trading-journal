"use client"

import * as React from "react"
import { Input as AriaInput, type InputProps } from "react-aria-components"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return <AriaInput ref={ref} data-slot="input" className={cn("h-10 w-full rounded-[var(--control-radius,var(--radius))] border border-input bg-[var(--control-bg,var(--surface-2))] px-3 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground/75 hover:border-border-strong focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20", className)} {...props} />
})

export { Input }
