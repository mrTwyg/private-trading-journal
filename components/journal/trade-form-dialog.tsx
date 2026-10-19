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
  trade?: Trade | null
  importDraft?: CodexDraft | null
  selectedDay?: Date | null
  onSave: (draft: TradeFormValues, image: File | null, removeImage: boolean) => Promise<void>
}) {
  const emptyDraft = (): TradeFormValues => ({
    accountId:
      trade?.accountId ??
      accounts.find(
        (account) =>
          !account.archived &&
          (selectedAccountId === "all" || account.id === selectedAccountId) &&
          !trackers.some(
            (t) => t.accountId === account.id && ["passed", "blown", "closed"].includes(t.status),
          ),
      )?.id ??
      "",
    tradedAt: defaultTradeDateTime(
      trade?.tradedAt ?? importDraft?.tradedAt ?? undefined,
      selectedDay,
    ),
    symbol: trade?.symbol ?? importDraft?.symbol ?? "",
    direction: trade?.direction ?? importDraft?.direction ?? "long",
    setupId:
      trade?.setupId ??
      setups.find((setup) => setup.name.toLowerCase() === importDraft?.setupName?.toLowerCase())
        ?.id ??
      "",
    setupDescription: trade?.setupDescription ?? importDraft?.setupDescription ?? "",
    tagIds:
      trade?.tags.map((tag) => tag.id) ??
      tags
        .filter((tag) =>
          importDraft?.tagNames.some((name) => name.toLowerCase() === tag.name.toLowerCase()),
        )
        .map((tag) => tag.id),
    riskAmount: trade?.riskAmount ?? importDraft?.riskAmount ?? 0,
    outcome: trade?.outcome ?? importDraft?.outcome ?? "win",
    resultAmount:
      (trade?.outcome ?? importDraft?.outcome) === "loss"
        ? (trade?.riskAmount ?? importDraft?.riskAmount ?? 0)
        : Math.abs(trade?.pnlAmount ?? importDraft?.resultAmount ?? 0),
    noteHtml: trade?.noteHtml ?? importDraft?.noteHtml ?? "",
  })

  const [draft, setDraft] = useState<TradeFormValues>(emptyDraft)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(
    trade?.image?.url ?? importDraft?.image?.url ?? null,
  )
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      // Reset the complete editor state whenever a different trade dialog opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(emptyDraft())
      setImage(null)
      setImagePreview(trade?.image?.url ?? importDraft?.image?.url ?? null)
      setRemoveImage(false)
      setError("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trade?.id, importDraft?.id, selectedDay, selectedAccountId])

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
    if (!draft.accountId) return setError("Choose an account.")
    handleImage(pastedImage)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.accountId) return setError("Choose an account.")
    if (!draft.symbol.trim()) return setError("Enter an instrument or symbol.")
    if (!Number.isFinite(draft.riskAmount) || draft.riskAmount <= 0)
      return setError("Risk must be greater than zero.")
    if (draft.outcome !== "breakeven" && draft.resultAmount <= 0)
      return setError("Enter how much the trade won or lost.")
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
      await onSave(
        {
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
      )
      onOpenChange(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the trade.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="trade-dialog sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {trade ? "Edit trade" : importDraft ? "Review Codex draft" : "Log a trade"}
          </DialogTitle>
          <DialogDescription>
            {importDraft
              ? "Check the highlighted facts before adding this draft to your journal."
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
              <Field label="Account" htmlFor="account">
                <AccountSelect
                  id="account"
                  accounts={accounts.filter(
                    (a) =>
                      a.id === trade?.accountId ||
                      !trackers.some(
                        (t) =>
                          t.accountId === a.id && ["passed", "blown", "closed"].includes(t.status),
                      ),
                  )}
                  value={draft.accountId}
                  onChange={(accountId) =>
                    setDraft({ ...draft, accountId, markAccountBlown: false })
                  }
                  includeAll={false}
                />
              </Field>
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
            {trackers.some(
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

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Outcome</legend>
              <div className="grid grid-cols-3 gap-2">
                {(["win", "loss", "breakeven"] as TradeOutcome[]).map((outcome) => (
                  <button
                    key={outcome}
                    type="button"
                    aria-pressed={draft.outcome === outcome}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        outcome,
                        resultAmount:
                          outcome === "loss"
                            ? draft.riskAmount
                            : outcome === "breakeven"
                              ? 0
                              : draft.resultAmount,
                      })
                    }
                    className={cn(
                      "outcome-choice",
                      draft.outcome === outcome && outcomeStyle[outcome],
                    )}
                  >
                    <OutcomeIcon outcome={outcome} />
                    <span className="capitalize">{outcome}</span>
                    {draft.outcome === outcome && <Check className="ml-auto size-4" />}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={`Risked (${trade?.currency ?? (trackers.some((t) => t.accountId === draft.accountId) ? "USD" : profile.defaultCurrency)})`}
                htmlFor="riskAmount"
              >
                <Input
                  id="riskAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={draft.riskAmount || ""}
                  onChange={(event) => {
                    const riskAmount = Number(event.target.value)
                    setDraft({
                      ...draft,
                      riskAmount,
                      resultAmount: draft.outcome === "loss" ? riskAmount : draft.resultAmount,
                    })
                  }}
                  required
                />
              </Field>
              <Field
                label={
                  draft.outcome === "win"
                    ? "Amount won"
                    : draft.outcome === "loss"
                      ? "Amount lost (same as risk)"
                      : "Result"
                }
                htmlFor="resultAmount"
              >
                <div className="relative">
                  <Input
                    id="resultAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    disabled={draft.outcome === "loss" || draft.outcome === "breakeven"}
                    value={
                      draft.outcome === "loss"
                        ? draft.riskAmount || ""
                        : draft.outcome === "breakeven"
                          ? 0
                          : draft.resultAmount || ""
                    }
                    onChange={(event) =>
                      setDraft({ ...draft, resultAmount: Number(event.target.value) })
                    }
                    className="pr-20"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                    {formatR(
                      calculateRMultiple(
                        signedPnl(draft.outcome, draft.resultAmount),
                        draft.riskAmount,
                      ),
                    )}
                  </span>
                </div>
              </Field>
            </div>

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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : trade
                  ? "Save changes"
                  : importDraft
                    ? "Add to journal"
                    : "Add trade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
