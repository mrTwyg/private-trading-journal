"use client"

import { Check } from "lucide-react"
import { Checkbox as AriaCheckbox, type CheckboxProps as AriaCheckboxProps } from "react-aria-components"

import { cn } from "@/lib/utils"

type CheckboxProps = Omit<AriaCheckboxProps, "isSelected" | "onChange" | "children" | "className"> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void; className?: string }

function Checkbox({ checked, onCheckedChange, className, ...props }: CheckboxProps) {
  return (
    <AriaCheckbox data-slot="checkbox" isSelected={checked} onChange={onCheckedChange} className={({ isFocusVisible, isSelected, isDisabled }) => cn("grid size-4 shrink-0 place-items-center rounded-[0.28rem] border border-input bg-[var(--surface-2)] text-primary-foreground outline-none transition-colors", isSelected && "border-primary bg-primary", isFocusVisible && "ring-2 ring-ring/45 ring-offset-2 ring-offset-background", isDisabled && "cursor-not-allowed opacity-50", className)} {...props}>
      {({ isSelected }) => isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
    </AriaCheckbox>
  )
}

export { Checkbox }
