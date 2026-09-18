"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button, Dialog as AriaDialog, Heading, Modal, ModalOverlay, Text } from "react-aria-components"

import { cn } from "@/lib/utils"

type SheetState = { open?: boolean; onOpenChange?: (open: boolean) => void }
const SheetContext = React.createContext<SheetState>({})

function Sheet({ open, onOpenChange, children }: SheetState & { children: React.ReactNode }) { return <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider> }

function SheetContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, onOpenChange } = React.useContext(SheetContext)
  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange} isDismissable className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-[4px] entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out">
      <Modal className="h-full w-full max-w-xl outline-none entering:animate-in entering:slide-in-from-right-8 exiting:animate-out exiting:slide-out-to-right-8">
        <AriaDialog data-slot="sheet-content" className={cn("relative flex h-full flex-col overflow-y-auto border-l border-border-strong bg-[var(--surface-1)] shadow-[-24px_0_80px_rgb(0_0_0/35%)] outline-none", className)}>
          {children}
          <Button slot="close" aria-label="Close" className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" /></Button>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="sheet-header" className={cn("border-b border-border px-5 py-5 pr-14", className)} {...props} /> }
function SheetTitle({ className, ...props }: React.ComponentProps<typeof Heading>) { return <Heading slot="title" className={cn("font-semibold tracking-[-0.02em]", className)} {...props} /> }
function SheetDescription({ className, ...props }: React.ComponentProps<typeof Text>) { return <Text slot="description" className={cn("mt-1 block text-sm text-muted-foreground", className)} {...props} /> }
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("mt-auto border-t border-border p-4", className)} {...props} /> }

export { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle }
