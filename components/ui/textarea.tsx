"use client"

import * as React from "react"
import { TextArea as AriaTextArea, type TextAreaProps } from "react-aria-components"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function Textarea({ className, ...props }, ref) {
  return <AriaTextArea ref={ref} data-slot="textarea" className={cn("min-h-24 w-full resize-y rounded-[var(--control-radius,var(--radius))] border border-input bg-[var(--control-bg,var(--surface-2))] px-3 py-2.5 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground/75 hover:border-border-strong focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
})

export { Textarea }
