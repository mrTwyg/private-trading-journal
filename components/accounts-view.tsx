"use client"

import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateTimeField } from "@/components/ui/date-time-field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { formatMoney } from "@/lib/trading"
import { accountColors } from "@/components/journal/shared"
import { DeleteAccountDialog } from "@/components/journal/delete-account-dialog"
import type {
  AccountTracker,
  AccountTrackerInput,
  JournalBootstrap,
  JournalDesktopApi,
  TradingAccount,
} from "@/lib/types"

export function AccountsView({
  accounts,
  trackers,
  firms,
  api,
  onReload,
}: {
  accounts: TradingAccount[]
  trackers: AccountTracker[]
  firms: { id: string; name: string }[]
  api: JournalDesktopApi
  onReload: (data: JournalBootstrap) => void
}) {
  const [filter, setFilter] = useState("active")
  const [groupByFirm, setGroupByFirm] = useState(true)
  const [editing, setEditing] = useState<TradingAccount | null>(null)
  const [draft, setDraft] = useState<AccountTrackerInput | null>(null)
  const [newName, setNewName] = useState("")
  const [color, setColor] = useState("cyan")
  const [deleting, setDeleting] = useState<TradingAccount | null>(null)
  const [busy, setBusy] = useState(false)
  const [action, setAction] = useState<{
    type: "pass" | "adjust"
    account: TradingAccount
    amount: string
    reason: string
  } | null>(null)
  const [error, setError] = useState("")
  const run = async (operation: () => Promise<JournalBootstrap>) => {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      onReload(await operation())
      setEditing(null)
      setDraft(null)
      setAction(null)
      toast.success("Account updated")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update account.")
    } finally {
      setBusy(false)
    }
  }
  const edit = (account: TradingAccount | null) => {
    const tracker = trackers.find((t) => t.accountId === account?.id)
    setError("")
    setEditing(account)
    setNewName(account?.name ?? "")
    setColor(account?.color ?? "cyan")
    setDraft(
      tracker
        ? { ...tracker, status: tracker.status === "passed" ? "closed" : tracker.status }
        : {
            firm: "",
            status: "evaluation",
            accountSize: 50000,
            openingBalance: 50000,
            startsAt: new Date().toISOString(),
            purchasePrice: 0,
            purchaseDate: format(new Date(), "yyyy-MM-dd"),
            discountCode: "",
          },
    )
  }
  const visible = accounts.filter((account) => {
    const t = trackers.find((item) => item.accountId === account.id)
    if (filter === "all") return true
    if (filter === "untracked") return !t
    if (filter === "history") return t && ["passed", "blown", "closed"].includes(t.status)
    return t && ["evaluation", "live"].includes(t.status)
  })
  const groups = groupByFirm
    ? [
        ...new Set(
          visible.map((a) => trackers.find((t) => t.accountId === a.id)?.firm || "Not tracked yet"),
        ),
      ].sort()
    : ["All accounts"]
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Purchase spending · USD</p>
          <p className="mt-3 font-mono text-2xl">
            {formatMoney({
              value: trackers.reduce((sum, t) => sum + t.purchasePrice, 0),
              currency: "USD",
            })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Includes historical evaluations; live copies cost $0
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Active accounts</p>
          <p className="mt-3 font-mono text-2xl">
            {trackers.filter((t) => ["evaluation", "live"].includes(t.status)).length}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-muted-foreground">Passed evaluations</p>
          <p className="mt-3 font-mono text-2xl">
            {trackers.filter((t) => t.status === "passed").length}
          </p>
        </div>
      </div>
      <section className="panel p-5 space-y-4">
        <Button onClick={() => edit(null)}>Add account</Button>
        <div className="flex flex-wrap gap-3 items-center">
          <Select aria-label="Account status filter" value={filter} onValueChange={setFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="history">History</SelectItem>
              <SelectItem value="untracked">Not tracked</SelectItem>
              <SelectItem value="all">All accounts</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            aria-pressed={groupByFirm}
            onClick={() => setGroupByFirm(!groupByFirm)}
          >
            Group by firm: {groupByFirm ? "On" : "Off"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Existing accounts stay unchanged until you enable tracking. Set the opening balance and
          start time after any trades already included in that balance.
        </p>
      </section>
      {!visible.length && (
        <div className="panel p-6 text-muted-foreground">
          No accounts in this view. Choose Not tracked to set up your existing accounts.
        </div>
      )}
      {groups.map((firm) => (
        <section key={firm} className="space-y-3">
          <h2 className="font-semibold">{firm}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {visible
              .filter(
                (a) =>
                  !groupByFirm ||
                  (trackers.find((t) => t.accountId === a.id)?.firm || "Not tracked yet") === firm,
              )
              .map((account) => {
                const t = trackers.find((item) => item.accountId === account.id)
                const parent = t?.evaluationId
                  ? accounts.find((a) => a.id === t.evaluationId)
                  : null
                const child = trackers.find((item) => item.evaluationId === account.id)
                return (
                  <article className="panel p-5 space-y-4" key={account.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold break-words">{account.name}</h3>
                        <p className="text-sm capitalize text-muted-foreground">
                          {t?.status || "Not tracked"}
                          {account.archived ? " · Archived" : ""}
                        </p>
                      </div>
                      {t && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Balance · USD</p>
                          <p className="font-mono text-xl">
                            {formatMoney({ value: t.balance, currency: "USD" })}
                          </p>
                        </div>
                      )}
                    </div>
                    {t && (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <p>
                            Account size
                            <br />
                            <strong>
                              {formatMoney({ value: t.accountSize, currency: "USD" })}
                            </strong>
                          </p>
                          <p>
                            Purchase price
                            <br />
                            <strong>
                              {formatMoney({ value: t.purchasePrice, currency: "USD" })}
                            </strong>
                          </p>
                          <p>
                            Purchased
                            <br />
                            {t.purchaseDate}
                          </p>
                          <p>
                            Discount code
                            <br />
                            {t.discountCode || "None"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Opening {formatMoney({ value: t.openingBalance, currency: "USD" })} ·
                          tracking from {format(new Date(t.startsAt), "d MMM yyyy HH:mm")}
                        </p>
                        {parent && <p className="text-sm">Passed evaluation: {parent.name}</p>}
                        {child && (
                          <p className="text-sm">
                            Live account: {accounts.find((a) => a.id === child.accountId)?.name}
                          </p>
                        )}
                        {t.adjustments.map((adjustment) => (
                          <p key={adjustment.id} className="text-xs text-muted-foreground">
                            {formatMoney({ value: adjustment.amount, currency: "USD" })} ·{" "}
                            {adjustment.reason} ·{" "}
                            {format(new Date(adjustment.createdAt), "d MMM yyyy")}
                          </p>
                        ))}
                      </>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {t?.status !== "passed" && (
                        <Button variant="outline" onClick={() => edit(account)}>
                          {t ? "Edit tracking" : "Enable tracking"}
                        </Button>
                      )}
                      {t?.status === "evaluation" && (
                        <Button
                          onClick={() => {
                            setError("")
                            setAction({
                              type: "pass",
                              account,
                              amount: String(t.accountSize),
                              reason: "",
                            })
                          }}
                        >
                          Move to Live
                        </Button>
                      )}
                      {t && ["evaluation", "live"].includes(t.status) && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setError("")
                            setAction({ type: "adjust", account, amount: "", reason: "" })
                          }}
                        >
                          Payout / adjustment
                        </Button>
                      )}
                      <Button variant="destructive" onClick={() => setDeleting(account)}>
                        Delete account
                      </Button>
                    </div>
                  </article>
                )
              })}
          </div>
        </section>
      ))}
      <Dialog open={Boolean(draft)} onOpenChange={(open) => !busy && !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit account" : "Add account"}</DialogTitle>
            <DialogDescription>
              All amounts are USD. The opening balance already includes trades before your chosen
              start time.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (!draft.firm) {
                  setError("Choose a prop firm. Add custom firms in Setups & tags.")
                  return
                }
                void run(async () => {
                  if (!editing)
                    return api.createTrackedAccount({ name: newName, color, tracker: draft })
                  await api.updateAccount({
                    id: editing.id,
                    changes: {
                      name: newName,
                      color,
                      archived: editing.archived,
                    },
                  })
                  return api.saveAccountTracker({ id: editing.id, tracker: draft })
                })
              }}
            >
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <Label htmlFor="tracker-name">Account name</Label>
                <Input
                  id="tracker-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  required
                  maxLength={60}
                />
                <Label htmlFor="tracker-color">Account colour</Label>
                <Select aria-label="Account colour" value={color} onValueChange={setColor}>
                  <SelectTrigger id="tracker-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(accountColors).map((value) => (
                      <SelectItem key={value} value={value} textValue={value}>
                        <span className="capitalize">{value}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label htmlFor="tracker-firm">Prop firm</Label>
                <Select
                  aria-label="Prop firm"
                  value={draft.firm}
                  onValueChange={(firm) => setDraft({ ...draft, firm })}
                >
                  <SelectTrigger id="tracker-firm" className="w-full">
                    <SelectValue placeholder="Choose a firm" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ...new Set([
                        ...firms.map((firm) => firm.name),
                        ...(draft.firm ? [draft.firm] : []),
                      ]),
                    ].map((firm) => (
                      <SelectItem key={firm} value={firm}>
                        {firm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Manage this list in Setups & tags.</p>
                <Label htmlFor="tracker-status">Status</Label>
                <Select
                  aria-label="Account stage"
                  value={draft.status}
                  onValueChange={(value) =>
                    setDraft({ ...draft, status: value as AccountTrackerInput["status"] })
                  }
                >
                  <SelectTrigger id="tracker-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["evaluation", "live", "blown", "closed"].map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["accountSize", "Account size (USD)"],
                      ["openingBalance", "Opening balance (USD)"],
                      ["purchasePrice", "Initial purchase (USD)"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <Label htmlFor={key}>{label}</Label>
                      <div className="relative">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          $
                        </span>
                        <Input
                          id={key}
                          className="pl-7"
                          type="number"
                          step="0.01"
                          min={key === "accountSize" ? "0.01" : "0"}
                          required
                          value={draft[key]}
                          disabled={
                            key === "purchasePrice" &&
                            Boolean(trackers.find((t) => t.accountId === editing?.id)?.evaluationId)
                          }
                          onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  ))}
                  <div>
                    <Label htmlFor="tracker-purchased">Purchase date</Label>
                    <Input
                      id="tracker-purchased"
                      type="date"
                      required
                      value={draft.purchaseDate}
                      onChange={(e) => setDraft({ ...draft, purchaseDate: e.target.value })}
                    />
                  </div>
                </div>
                <Label htmlFor="tracker-start">Start tracking from (local date and time)</Label>
                <DateTimeField
                  id="tracker-start"
                  value={format(new Date(draft.startsAt), "yyyy-MM-dd'T'HH:mm")}
                  onChange={(value) => {
                    if (value) setDraft({ ...draft, startsAt: new Date(value).toISOString() })
                  }}
                />
                <Label htmlFor="tracker-code">Discount code (optional)</Label>
                <Input
                  id="tracker-code"
                  value={draft.discountCode}
                  onChange={(e) => setDraft({ ...draft, discountCode: e.target.value })}
                  maxLength={80}
                />
                {error && (
                  <p role="alert" className="text-[var(--loss)]">
                    {error}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {editing ? "Save account" : "Create account"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(action)} onOpenChange={(open) => !busy && !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action?.type === "pass"
                ? "Pass evaluation and create Live account"
                : "Record payout or balance adjustment"}
            </DialogTitle>
            <DialogDescription>
              {action?.type === "pass"
                ? `${action.account.name} will be marked Passed. Its history and purchase cost stay there. A linked Live account starts with no trades and no additional purchase cost.`
                : "Use a negative amount for a payout and a positive amount for a credit. This changes balance, not trading P&L."}
            </DialogDescription>
          </DialogHeader>
          {action && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void run(() =>
                  action.type === "pass"
                    ? api.passAccount({
                        id: action.account.id,
                        openingBalance: Number(action.amount),
                      })
                    : api.adjustAccount({
                        id: action.account.id,
                        amount: Number(action.amount),
                        reason: action.reason,
                      }),
                )
              }}
            >
              <div className="p-6 space-y-4">
                <Label htmlFor="action-amount">
                  {action.type === "pass"
                    ? "Live starting balance (USD)"
                    : "Signed adjustment (USD)"}
                </Label>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    $
                  </span>
                  <Input
                    id="action-amount"
                    className="pl-7"
                    type="number"
                    step="0.01"
                    min={action.type === "pass" ? 0 : undefined}
                    required
                    value={action.amount}
                    onChange={(e) => setAction({ ...action, amount: e.target.value })}
                  />
                </div>
                {action.type === "adjust" && (
                  <>
                    <Label htmlFor="action-reason">Reason</Label>
                    <Input
                      id="action-reason"
                      required
                      maxLength={200}
                      value={action.reason}
                      onChange={(e) => setAction({ ...action, reason: e.target.value })}
                    />
                  </>
                )}
                {error && (
                  <p role="alert" className="text-[var(--loss)]">
                    {error}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setAction(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  Confirm
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <DeleteAccountDialog
        account={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async ({ account, confirmationName: name }) => {
          onReload(await api.deleteAccount({ id: account.id, confirmationName: name }))
          toast.success("Account permanently deleted")
        }}
      />
    </div>
  )
}
