"use client"

import * as React from "react"
import { Tab, TabList, TabPanel, Tabs as AriaTabs, type Key } from "react-aria-components"

import { cn } from "@/lib/utils"

function Tabs({ className, value, defaultValue, onValueChange, children }: { className?: string; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; children: React.ReactNode }) {
  return <AriaTabs className={className} selectedKey={value} defaultSelectedKey={defaultValue} onSelectionChange={(key: Key) => onValueChange?.(String(key))}>{children}</AriaTabs>
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <TabList className={cn("inline-flex h-9 items-center rounded-[var(--control-radius,var(--radius))] border border-border bg-[var(--surface-2)] p-1", className)}>{children}</TabList>
}

function TabsTrigger({ className, value, children }: { className?: string; value: string; children: React.ReactNode }) {
  return <Tab id={value} className={({ isSelected, isFocusVisible }) => cn("flex h-7 items-center rounded-[calc(var(--radius)*0.7)] px-3 text-xs font-semibold text-muted-foreground outline-none", isSelected && "bg-[var(--surface-3)] text-foreground shadow-sm", isFocusVisible && "ring-2 ring-ring/40", className)}>{children}</Tab>
}

function TabsContent({ className, value, children }: { className?: string; value: string; children: React.ReactNode }) {
  return <TabPanel id={value} className={cn("outline-none", className)}>{children}</TabPanel>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
