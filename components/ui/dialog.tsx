"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button as AriaButton, Dialog as AriaDialog, Heading, Modal, ModalOverlay, Text } from "react-aria-components"

import { cn } from "@/lib/utils"

type DialogState = { open?: boolean; onOpenChange?: (open: boolean) => void }
const DialogContext = React.createContext<DialogState>({})

function Dialog({ open, onOpenChange, children }: DialogState & { children: React.ReactNode }) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

function DialogContent({ className, children, showCloseButton = true }: { className?: string; children: React.ReactNode; showCloseButton?: boolean }) {
  const { open, onOpenChange } = React.useContext(DialogContext)
  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange} isDismissable className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-[6px] entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out">
      <Modal className="w-full max-w-2xl outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95">
        <AriaDialog data-slot="dialog-content" className={cn("relative max-h-[92vh] overflow-hidden rounded-[calc(var(--radius)+0.35rem)] border border-border-strong bg-[var(--surface-1)] shadow-[0_34px_100px_rgb(0_0_0/55%)] outline-none", className)}>
          {children}
          {showCloseButton && <AriaButton slot="close" aria-label="Close" className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" /></AriaButton>}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="dialog-header" className={cn("border-b border-border px-6 py-5 pr-14", className)} {...props} /> }
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="dialog-footer" className={cn("sticky bottom-0 z-10 flex justify-end gap-2 border-t border-border bg-[color-mix(in_srgb,var(--surface-1)_94%,transparent)] px-6 py-4 backdrop-blur-xl", className)} {...props} /> }
function DialogTitle({ className, ...props }: React.ComponentProps<typeof Heading>) { return <Heading slot="title" className={cn("text-lg font-semibold tracking-[-0.02em]", className)} {...props} /> }
function DialogDescription({ className, ...props }: React.ComponentProps<typeof Text>) { return <Text slot="description" className={cn("mt-1 block text-sm text-muted-foreground", className)} {...props} /> }
function DialogClose({ children }: { children: React.ReactNode }) { return <AriaButton slot="close">{children}</AriaButton> }

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle }
