"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button, ListBox, ListBoxItem, Popover, Select as AriaSelect, SelectValue as AriaSelectValue, type Key } from "react-aria-components"

import { cn } from "@/lib/utils"

type SelectProps = { value?: string; onValueChange?: (value: string) => void; children: React.ReactNode; isDisabled?: boolean; "aria-label"?: string }

function Select({ value, onValueChange, children, isDisabled, "aria-label": ariaLabel }: SelectProps) {
  return <AriaSelect aria-label={ariaLabel} selectedKey={value ?? null} onSelectionChange={(key: Key | null) => key != null && onValueChange?.(String(key))} isDisabled={isDisabled}>{children}</AriaSelect>
}

function SelectTrigger({ className, children, id }: { className?: string; children?: React.ReactNode; id?: string }) {
  return (
    <Button id={id} data-slot="select-trigger" className={cn("flex h-10 w-fit items-center justify-between gap-3 rounded-[var(--control-radius,var(--radius))] border border-input bg-[var(--control-bg,var(--surface-2))] px-3 text-sm text-foreground shadow-sm outline-none hover:border-border-strong focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50", className)}>
      {children}<ChevronDown className="size-4 text-muted-foreground" />
    </Button>
  )
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  return <AriaSelectValue className="min-w-0 flex-1 truncate text-left data-[placeholder]:text-muted-foreground">{({ selectedText }) => selectedText || placeholder}</AriaSelectValue>
}

function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Popover data-slot="select-content" placement="bottom start" offset={6} className={cn("z-[80] min-w-[var(--trigger-width)] overflow-auto rounded-[calc(var(--radius)+0.15rem)] border border-border-strong bg-popover p-1 text-popover-foreground shadow-[0_20px_55px_rgb(0_0_0/35%)] outline-none entering:animate-in entering:fade-in entering:slide-in-from-top-1 exiting:animate-out exiting:fade-out", className)}>
      <ListBox className="max-h-72 outline-none">{children}</ListBox>
    </Popover>
  )
}

function SelectItem({ className, children, value, textValue }: { className?: string; children: React.ReactNode; value: string; textValue?: string }) {
  return (
    <ListBoxItem id={value} textValue={textValue ?? (typeof children === "string" ? children : value)} className={({ isFocused, isSelected, isDisabled }) => cn("relative flex min-h-9 cursor-default items-center rounded-[0.45rem] px-2.5 pr-8 text-sm outline-none", (isFocused || isSelected) && "bg-accent text-accent-foreground", isDisabled && "opacity-45", className)}>
      {({ isSelected }) => <>{children}{isSelected && <Check className="absolute right-2.5 size-4 text-primary" />}</>}
    </ListBoxItem>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
