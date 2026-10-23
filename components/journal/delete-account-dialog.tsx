"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { TradingAccount } from "@/lib/types"

export function DeleteAccountDialog({
  account,
  onClose,
  onConfirm,
}: {
  account: TradingAccount | null
  onClose: () => void
  onConfirm: (input: { account: TradingAccount; confirmationName: string }) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  return (
    <AlertDialog open={Boolean(account)} onOpenChange={(open) => !busy && !open && onClose()}>
      <AlertDialogContent>
        {account && (
          <DeleteAccountForm
            key={account.id}
            account={account}
            onClose={onClose}
            onConfirm={onConfirm}
            busy={busy}
            setBusy={setBusy}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteAccountForm({
  account,
  onClose,
  onConfirm,
  busy,
  setBusy,
}: {
  account: TradingAccount
  onClose: () => void
  onConfirm: (input: { account: TradingAccount; confirmationName: string }) => Promise<void>
  busy: boolean
  setBusy: (busy: boolean) => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        if (busy || name !== account.name) return
        setBusy(true)
        setError("")
        try {
          await onConfirm({ account, confirmationName: name })
          onClose()
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not delete account.")
        } finally {
          setBusy(false)
        }
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {account.name} permanently?</AlertDialogTitle>
        <AlertDialogDescription>
          This permanently deletes this account, its trades, screenshots, tracking details and
          balance adjustments. It cannot be undone. A linked evaluation or Live account keeps its
          own history, but its link to this account is removed.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-3 px-6 pb-6">
        <Label htmlFor="delete-account-name">Type the exact account name: {account.name}</Label>
        <Input
          id="delete-account-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          disabled={busy}
        />
        {error && (
          <p role="alert" className="text-[var(--loss)]">
            {error}
          </p>
        )}
      </div>
      <AlertDialogFooter>
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={busy || name !== account.name}>
          {busy ? "Deleting…" : "Delete permanently"}
        </Button>
      </AlertDialogFooter>
    </form>
  )
}
