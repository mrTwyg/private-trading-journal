"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const AlertDialog = Dialog
function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof DialogContent>) { return <DialogContent showCloseButton={false} className={cn("max-w-md", className)} {...props} /> }
const AlertDialogHeader = DialogHeader
const AlertDialogFooter = DialogFooter
const AlertDialogTitle = DialogTitle
const AlertDialogDescription = DialogDescription
function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof Button>) { return <Button slot="close" variant="outline" className={className} {...props} /> }
function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof Button>) { return <Button slot="close" className={className} {...props} /> }

export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle }
