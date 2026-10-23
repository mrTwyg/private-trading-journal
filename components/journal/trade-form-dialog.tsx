/* eslint-disable @next/next/no-img-element */
import { type ClipboardEvent, type FormEvent, useEffect, useState } from "react"
import { Check, ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DateTimeField } from "@/components/ui/date-time-field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  JournalBootstrap,
  Profile,
  Setup,
  Tag,
  Trade,
  TradingAccount,
  TradeDirection,
  TradeDraft as CodexDraft,
  TradeFormSaveInput,
  TradeFormValues,
  TradeOutcome,
} from "@/lib/types"
import { calculateRMultiple, defaultTradeDateTime, formatR, signedPnl } from "@/lib/trading"
import { Field, AccountSelect, outcomeStyle, OutcomeIcon } from "@/components/journal/shared"
import { RichTextEditor } from "@/components/journal/rich-text-editor"

export function TradeFormDialog({
  open,
  onOpenChange,
  profile,
  accounts,
  trackers,
  selectedAccountId,
  setups,
  tags,
  trade,
  copyTrade,
  importDraft,
  selectedDay,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: Profile
  accounts: TradingAccount[]
  trackers: JournalBootstrap["accountTrackers"]
  selectedAccountId: string
  setups: Setup[]
  tags: Tag[]
  copyTrade?: Trade | null
  trade?: Trade | null
  importDraft?: CodexDraft | null
  selectedDay?: Date | null
  onSave: (input: TradeFormSaveInput) => Promise<void>
}) {
  const source = trade ?? copyTrade
  const multiAccount = !trade && !importDraft
  const availableAccounts = accounts.filter(
    (a) =>
      !a.archived &&
      !trackers.some(
        (t) => t.accountId === a.id && ["passed", "blown", "closed"].includes(t.status),
      ),
  )
  const accountCurrency = (id: string) =>
    trackers.some((t) => t.accountId === id) ? "USD" : profile.defaultCurrency

  const emptyDraft = (): TradeFormValues => ({
    accountId:
      (copyTrade ? "" : trade?.accountId) ??
      accounts.find(
        (account) =>
          !account.archived &&
          (selectedAccountId === "all" || account.id === selectedAccountId) &&
          !trackers.some(
            (t) => t.accountId === account.id && ["passed", "blown", "closed"].includes(t.status),
          ),
      )?.id ??
      "",
    tradedAt: defaultTradeDateTime({
      iso: source?.tradedAt ?? importDraft?.tradedAt ?? undefined,
      selectedDay,
    }),
    symbol: source?.symbol ?? importDraft?.symbol ?? "",
    direction: source?.direction ?? importDraft?.direction ?? "long",
    setupId:
      source?.setupId ??
      setups.find((setup) => setup.name.toLowerCase() === importDraft?.setupName?.toLowerCase())
        ?.id ??
      "",
    setupDescription: source?.setupDescription ?? importDraft?.setupDescription ?? "",
    tagIds:
      source?.tags.map((tag) => tag.id) ??
      tags
        .filter((tag) =>
          importDraft?.tagNames.some((name) => name.toLowerCase() === tag.name.toLowerCase()),
        )
        .map((tag) => tag.id),
    riskAmount: source?.riskAmount ?? importDraft?.riskAmount ?? 0,
    outcome: source?.outcome ?? importDraft?.outcome ?? "win",
    resultAmount:
      (source?.outcome ?? importDraft?.outcome) === "loss"
        ? (source?.riskAmount ?? importDraft?.riskAmount ?? 0)
        : Math.abs(source?.pnlAmount ?? importDraft?.resultAmount ?? 0),
    noteHtml: source?.noteHtml ?? importDraft?.noteHtml ?? "",
  })

  const [draft, setDraft] = useState<TradeFormValues>(emptyDraft)
  const [accountIds, setAccountIds] = useState<string[]>(() =>
    copyTrade ? [] : [emptyDraft().accountId].filter(Boolean),
  )
  const [accountResults, setAccountResults] = useState<
    NonNullable<TradeFormSaveInput["accountResults"]>
  >({})
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    source?.image?.url ?? importDraft?.image?.url ?? null,
  )
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      // Reset the complete editor state whenever a different trade dialog opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(emptyDraft())
      setAccountResults({})
      setAccountIds(copyTrade ? [] : [emptyDraft().accountId].filter(Boolean))
      setImage(null)
      setImagePreview(source?.image?.url ?? importDraft?.image?.url ?? null)
      setRemoveImage(false)
      setError("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trade?.id, copyTrade?.id, importDraft?.id, selectedDay, selectedAccountId])

  const handleImage = (file?: File) => {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("The image must be 10 MB or smaller.")
      return
    }
    setError("")
    setImage(file)
    setRemoveImage(false)
    setImagePreview(URL.createObjectURL(file))
  }

  const handlePaste = (event: ClipboardEvent<HTMLFormElement>) => {
    const pastedImage = Array.from(event.clipboardData.items)
      .find(
        (item) =>
          item.kind === "file" && ["image/jpeg", "image/png", "image/webp"].includes(item.type),
      )
      ?.getAsFile()
    if (!pastedImage) return
    event.preventDefault()
    handleImage(pastedImage)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (multiAccount ? !accountIds.length : !draft.accountId)
      return setError("Choose at least one account.")
    if (!draft.symbol.trim()) return setError("Enter an instrument or symbol.")
    if (!Number.isFinite(draft.riskAmount) || draft.riskAmount <= 0)
      return setError("Risk must be greater than zero.")
    if (draft.outcome !== "breakeven" && draft.resultAmount <= 0)
      return setError("Enter how much the trade won or lost.")
    const results =
      multiAccount && accountIds.length > 1
        ? Object.fromEntries(
            accountIds.map((id) => {
              const values = id === draft.accountId ? draft : (accountResults[id] ?? draft)
              return [
                id,
                {
                  riskAmount: values.riskAmount,
                  outcome: values.outcome,
                  resultAmount:
                    values.outcome === "loss"
                      ? values.riskAmount
                      : values.outcome === "breakeven"
                        ? 0
                        : values.resultAmount,
                },
              ]
            }),
          )
        : undefined
    if (
      results &&
      Object.values(results).some(
        (r) =>
          !Number.isFinite(r.riskAmount) ||
          r.riskAmount <= 0 ||
          !Number.isFinite(r.resultAmount) ||
          (r.outcome !== "breakeven" && r.resultAmount <= 0),
      )
    )
      return setError("Enter a valid risk and result for every selected account.")
    if (
      draft.markAccountBlown &&
      !window.confirm(
        `Mark ${accounts.find((account) => account.id === draft.accountId)?.name} as blown when this trade is saved? Its trade history will remain available.`,
      )
    )
      return
    setSaving(true)
    setError("")
    try {
      await onSave({
        draft: {
          ...draft,
          symbol: draft.symbol.trim().toUpperCase(),
          resultAmount:
            draft.outcome === "loss"
              ? draft.riskAmount
              : draft.outcome === "breakeven"
                ? 0
                : draft.resultAmount,
        },
        image,
        removeImage,
        ...(results ? { accountResults: results } : {}),
        accountIds: multiAccount ? accountIds : [draft.accountId],
      })
      onOpenChange(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the trade.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="trade-dialog sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {trade
              ? "Edit trade"
              : copyTrade
                ? "Copy trade to accounts"
                : importDraft
                  ? "Review Codex draft"
                  : "Log a trade"}
          </DialogTitle>
          <DialogDescription>
            {importDraft
              ? "Check the highlighted facts before adding this draft to your journal."
              : copyTrade
                ? "Choose the destination accounts. Change risk or result before saving; the original stays unchanged."
                : "Capture the decision while it is still fresh."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} onPaste={handlePaste} className="trade-form">
          <div className="trade-form-scroll space-y-5">
            {importDraft &&
              (importDraft.missingFields.length > 0 || importDraft.uncertainFields.length > 0) && (
                <div
                  className="rounded-lg border border-amber-400/45 bg-amber-400/10 px-3 py-3 text-sm text-foreground"
                  role="status"
                >
                  <strong>Needs review:</strong>{" "}
                  {[
                    ...new Set([...importDraft.missingFields, ...importDraft.uncertainFields]),
                  ].join(", ")}
                  .
                </div>
              )}
            <div className="grid gap-4 sm:grid-cols-2">
              {multiAccount ? (
                <fieldset className="space-y-2 sm:col-span-2" disabled={saving}>
                  <legend className="mb-2 text-sm font-medium">Accounts</legend>
                  <p className="text-sm text-muted-foreground">
                    Select the accounts that took this trade, then adjust each account�s risk and
                    result below.
                  </p>
                  <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                    {availableAccounts.map((account) => (
                      <label key={account.id} className="tag-choice">
                        <Checkbox
                          checked={accountIds.includes(account.id)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...accountIds, account.id]
                              : accountIds.filter((id) => id !== account.id)
                            if (!checked)
                              setAccountResults((current) => {
                                const remaining = { ...current }
                                delete remaining[account.id]
                                return remaining
                              })
                            setAccountIds(next)
                            setDraft({
                              ...draft,
                              ...(next[0] !== draft.accountId ? accountResults[next[0]] : {}),
                              accountId: next[0] ?? "",
                              markAccountBlown: false,
                            })
                          }}
                        />
                        {account.name} ({accountCurrency(account.id)})
                      </label>
                    ))}
                  </div>
                  {!availableAccounts.length && (
                    <p className="text-sm text-muted-foreground">
                      Create an active account before logging a trade.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground" role="status">
                    {accountIds.length} account{accountIds.length === 1 ? "" : "s"} selected.
                    {accountIds.length > 1 &&
                      " Editing or deleting a saved copy affects only that account."}
                  </p>
                </fieldset>
              ) : (
                <Field label="Account" htmlFor="account">
                  <AccountSelect
                    id="account"
                    accounts={accounts.filter(
                      (a) =>
                        a.id === source?.accountId ||
                        !trackers.some(
                          (t) =>
                            t.accountId === a.id &&
                            ["passed", "blown", "closed"].includes(t.status),
                        ),
                    )}
                    value={draft.accountId}
                    onChange={(accountId) =>
                      setDraft({ ...draft, accountId, markAccountBlown: false })
                    }
                    includeAll={false}
                  />
                </Field>
              )}
              <Field label="Date and time" htmlFor="tradedAt">
                <DateTimeField
                  id="tradedAt"
                  value={draft.tradedAt}
                  onChange={(tradedAt) => setDraft({ ...draft, tradedAt })}
                />
              </Field>
              <Field label="Instrument" htmlFor="symbol">
                <Select
                  aria-label="Instrument"
                  value={draft.symbol || undefined}
                  onValueChange={(value) => setDraft({ ...draft, symbol: value })}
                >
                  <SelectTrigger id="symbol" className="w-full">
                    <SelectValue placeholder="Choose an instrument" />
                  </SelectTrigger>
                  <SelectContent>
                    {["NQ", "ES", "MNQ", "MES"].map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Direction" htmlFor="direction">
                <Select
                  aria-label="Direction"
                  value={draft.direction}
                  onValueChange={(value) =>
                    setDraft({ ...draft, direction: value as TradeDirection })
                  }
                >
                  <SelectTrigger id="direction" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Setup" htmlFor="setup">
                <Select
                  aria-label="Setup"
                  value={draft.setupId || "none"}
                  onValueChange={(value) =>
                    setDraft({ ...draft, setupId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger id="setup" className="w-full">
                    <SelectValue placeholder="Choose a setup" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No setup</SelectItem>
                    {setups.map((setup) => (
                      <SelectItem value={setup.id} key={setup.id}>
                        {setup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {trackers.some((t) => t.accountId === draft.accountId) && (
              <p className="text-sm text-muted-foreground">
                {trade
                  ? `Trade currency: ${trade.currency}. Historical currencies are preserved.`
                  : "Tracked account: risk and result are recorded in USD."}
              </p>
            )}
            {(!multiAccount || accountIds.length === 1) &&
              trackers.some(
                (t) => t.accountId === draft.accountId && ["evaluation", "live"].includes(t.status),
              ) && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(draft.markAccountBlown)}
                    onCheckedChange={(checked) =>
                      setDraft({ ...draft, markAccountBlown: Boolean(checked) })
                    }
                  />
                  This trade blew the account
                </label>
              )}
            <Field label="Setup description" htmlFor="setup-description">
              <Textarea
                id="setup-description"
                rows={3}
                placeholder="London low sweep → bullish SMT → 1m IFVG"
                value={draft.setupDescription}
                onChange={(event) => setDraft({ ...draft, setupDescription: event.target.value })}
              />
            </Field>

            {(multiAccount && accountIds.length > 1 ? accountIds : [draft.accountId]).map(
              (accountId) => {
                const values =
                  accountId === draft.accountId ? draft : { ...draft, ...accountResults[accountId] }
                const updateValues = (next: TradeFormValues) => {
                  if (accountId === draft.accountId) setDraft(next)
                  else
                    setAccountResults((current) => ({
                      ...current,
                      [accountId]: {
                        riskAmount: next.riskAmount,
                        outcome: next.outcome,
                        resultAmount: next.resultAmount,
                      },
                    }))
                }
                return (
                  <fieldset key={accountId} className="space-y-4" disabled={saving}>
                    {multiAccount && accountIds.length > 1 && (
                      <legend className="mb-3 text-sm font-medium">
                        {accounts.find((a) => a.id === accountId)?.name} (
                        {accountCurrency(accountId)})
                      </legend>
                    )}
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium">Outcome</legend>
                      <div className="grid grid-cols-3 gap-2">
                        {(["win", "loss", "breakeven"] as TradeOutcome[]).map((outcome) => (
                          <button
                            key={outcome}
                            type="button"
                            aria-pressed={values.outcome === outcome}
                            onClick={() =>
                              updateValues({
                                ...values,
                                outcome,
                                resultAmount:
                                  outcome === "loss"
                                    ? values.riskAmount
                                    : outcome === "breakeven"
                                      ? 0
                                      : values.resultAmount,
                              })
                            }
                            className={cn(
                              "outcome-choice",
                              values.outcome === outcome && outcomeStyle[outcome],
                            )}
                          >
                            <OutcomeIcon outcome={outcome} />
                            <span className="capitalize">{outcome}</span>
                            {values.outcome === outcome && <Check className="ml-auto size-4" />}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label={`Risked (${source?.currency ?? (trackers.some((t) => t.accountId === accountId) ? "USD" : profile.defaultCurrency)})`}
                        htmlFor={`riskAmount-${accountId}`}
                      >
                        <Input
                          id={`riskAmount-${accountId}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          inputMode="decimal"
                          value={values.riskAmount || ""}
                          onChange={(event) => {
                            const riskAmount = Number(event.target.value)
                            updateValues({
                              ...values,
                              riskAmount,
                              resultAmount:
                                values.outcome === "loss" ? riskAmount : values.resultAmount,
                            })
                          }}
                          required
                        />
                      </Field>
                      <Field
                        label={
                          values.outcome === "win"
                            ? "Amount won"
                            : values.outcome === "loss"
                              ? "Amount lost (same as risk)"
                              : "Result"
                        }
                        htmlFor={`resultAmount-${accountId}`}
                      >
                        <div className="relative">
                          <Input
                            id={`resultAmount-${accountId}`}
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            disabled={values.outcome === "loss" || values.outcome === "breakeven"}
                            value={
                              values.outcome === "loss"
                                ? values.riskAmount || ""
                                : values.outcome === "breakeven"
                                  ? 0
                                  : values.resultAmount || ""
                            }
                            onChange={(event) =>
                              updateValues({ ...values, resultAmount: Number(event.target.value) })
                            }
                            className="pr-20"
                            required
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                            {formatR(
                              calculateRMultiple({
                                pnlAmount: signedPnl({
                                  outcome: values.outcome,
                                  resultAmount: values.resultAmount,
                                }),
                                riskAmount: values.riskAmount,
                              }),
                            )}
                          </span>
                        </div>
                      </Field>
                    </div>
                  </fieldset>
                )
              },
            )}

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Tags</legend>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = draft.tagIds.includes(tag.id)
                  return (
                    <label
                      key={tag.id}
                      className={cn(
                        "tag-choice",
                        selected &&
                          "border-[var(--accent-cyan)] bg-[var(--accent-cyan-soft)] text-[var(--accent-cyan)]",
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) =>
                          setDraft({
                            ...draft,
                            tagIds: checked
                              ? [...draft.tagIds, tag.id]
                              : draft.tagIds.filter((id) => id !== tag.id),
                          })
                        }
                      />
                      {tag.name}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <Field label="Thought process" htmlFor="note-editor">
              <RichTextEditor
                value={draft.noteHtml}
                onChange={(noteHtml) => setDraft({ ...draft, noteHtml })}
              />
            </Field>

            <Field label="Screenshot" htmlFor="image">
              {imagePreview ? (
                <div>
                  <div className="relative overflow-hidden rounded-lg border border-border bg-black/20">
                    <img
                      src={imagePreview}
                      alt="Trade screenshot preview"
                      className="max-h-48 w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="absolute right-2 top-2"
                      onClick={() => {
                        setImage(null)
                        setImagePreview(null)
                        setRemoveImage(true)
                      }}
                      aria-label="Remove screenshot"
                    >
                      <X />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Paste another image with Ctrl+V to replace it.
                  </p>
                </div>
              ) : (
                <label htmlFor="image" className="image-drop">
                  <ImagePlus className="size-5 text-[var(--accent-cyan)]" />
                  <span>
                    <strong>Choose a file or paste a screenshot</strong>
                    <small>
                      Press Ctrl+V anywhere in this form · JPEG, PNG or WebP · 10 MB max
                    </small>
                  </span>
                  <Input
                    id="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => handleImage(event.target.files?.[0])}
                  />
                </label>
              )}
            </Field>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-[var(--loss-border)] bg-[var(--loss-soft)] px-3 py-2 text-sm text-[var(--loss)]"
              >
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || (multiAccount && !accountIds.length)}>
              {saving
                ? "Saving…"
                : trade
                  ? "Save changes"
                  : importDraft
                    ? "Add to journal"
                    : `Save to ${accountIds.length} account${accountIds.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
