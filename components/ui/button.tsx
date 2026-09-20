"use client"

import * as React from "react"
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--control-radius,var(--radius))] border border-transparent text-sm font-semibold outline-none transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 data-[pressed]:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_8px_24px_var(--accent-glow)] hover:brightness-105",
        destructive: "bg-destructive text-white hover:brightness-105",
        outline: "border-border-strong bg-[var(--surface-2)] text-foreground shadow-sm hover:border-[var(--accent-cyan)] hover:bg-[var(--surface-3)]",
        secondary: "border-border bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 gap-1 px-2 text-xs",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "size-10",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

type ButtonProps = Omit<AriaButtonProps, "className" | "isDisabled"> &
  VariantProps<typeof buttonVariants> & {
    className?: string
    disabled?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", disabled, ...props },
  ref,
) {
  return <AriaButton ref={ref} data-slot="button" isDisabled={disabled} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})

export { Button, buttonVariants }
