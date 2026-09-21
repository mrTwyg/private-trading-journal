"use client"

/* eslint-disable @next/next/no-img-element */

import {
  type ClipboardEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  addDays,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
} from "date-fns"
import {
  ArrowDownRight,
  ArrowUpRight,
  Bold,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  Copy,
  Download,
  HardDrive,
  ImagePlus,
  Inbox,
  Italic,
  Link2,
  List,
  Maximize2,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  FolderOpen,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { I18nProvider } from "react-aria-components/I18nProvider"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  JournalBootstrap,
  JournalDesktopApi,
  CodexImportReceipt,
  CodexIntegrationStatus,
  Profile,
  Setup,
  Tag,
  Trade,
  TradeDirection,
  TradeDraft as CodexDraft,
  TradeFormValues,
  TradeOutcome,
} from "@/lib/types"
import {
  aggregateTrades,
  calculateRMultiple,
  calendarDays,
  defaultTradeDateTime,
  formatMoney,
  formatR,
  periodLabel,
  shiftAnchor,
  signedPnl,
  tradesForDay,
} from "@/lib/trading"

type Page = "calendar" | "trades" | "inbox" | "organise" | "settings"

const pageCopy: Record<Page, { title: string; description: string }> = {
  calendar: { title: "Calendar", description: "Review the shape of your trading." },
  trades: { title: "Trade journal", description: "Every decision, in one place." },
  inbox: { title: "Codex inbox", description: "Review voice and screenshot imports." },
  organise: { title: "Setups & tags", description: "Keep your review language consistent." },
  settings: { title: "Settings", description: "Your journal preferences." },
}

const navItems: { id: Page; label: string; icon: typeof CalendarDays }[] = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "trades", label: "Trades", icon: BookOpen },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "organise", label: "Setups & tags", icon: SlidersHorizontal },
  { id: "settings", label: "Settings", icon: Settings },
]

const outcomeStyle: Record<TradeOutcome, string> = {
  win: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]",
  loss: "border-[var(--loss-border)] bg-[var(--loss-soft)] text-[var(--loss)]",
  breakeven: "border-border bg-secondary text-muted-foreground",
}

function OutcomeIcon({ outcome, className }: { outcome: TradeOutcome; className?: string }) {
  const Icon = outcome === "win" ? TrendingUp : outcome === "loss" ? TrendingDown : CircleMinus
  return <Icon className={cn("size-4", className)} aria-hidden="true" />
}

function OutcomeBadge({ outcome }: { outcome: TradeOutcome }) {
  return (
    <Badge variant="outline" className={cn("capitalize", outcomeStyle[outcome])}>
      <OutcomeIcon outcome={outcome} className="size-3" />
      {outcome}
    </Badge>
  )
}

function StatCard({
  label,
  value,
  meta,
  tone = "neutral",
}: {
  label: string
  value: string
  meta: string
  tone?: "positive" | "negative" | "neutral"
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            "status-pip",
            tone === "positive" && "bg-[var(--success)]",
            tone === "negative" && "bg-[var(--loss)]",
            tone === "neutral" && "bg-[var(--accent-cyan)]",
          )}
        />
      </div>
      <p
        className={cn(
          "mt-3 font-mono text-[1.65rem] font-semibold tracking-[-0.04em]",
          tone === "positive" && "text-[var(--success)]",
          tone === "negative" && "text-[var(--loss)]",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
    </div>
  )
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value
  }, [value])

  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus()
    document.execCommand(name, false, commandValue)
    onChange(editorRef.current?.innerHTML ?? "")
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-[var(--surface-2)] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
      <div className="flex items-center gap-1 border-b border-border p-1.5" aria-label="Note formatting controls">
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => command("bold")} aria-label="Bold">
          <Bold />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => command("italic")} aria-label="Italic">
          <Italic />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => command("insertUnorderedList")} aria-label="Bulleted list">
          <List />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            const url = window.prompt("Paste a link")
            if (url) command("createLink", url)
          }}
          aria-label="Add link"
        >
          <Link2 />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Thought process"
        data-placeholder="Why did you take this trade? What did you notice?"
        className="rich-editor min-h-32 px-3 py-3 text-sm leading-6 outline-none"
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  )
}

function TradeFormDialog({
  open,
  onOpenChange,
  profile,
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
  setups: Setup[]
  tags: Tag[]
  trade?: Trade | null
  importDraft?: CodexDraft | null
  selectedDay?: Date | null
  onSave: (draft: TradeFormValues, image: File | null, removeImage: boolean) => Promise<void>
}) {
  const emptyDraft = (): TradeFormValues => ({
    tradedAt: defaultTradeDateTime(trade?.tradedAt ?? importDraft?.tradedAt ?? undefined, selectedDay),
    symbol: trade?.symbol ?? importDraft?.symbol ?? "",
    direction: trade?.direction ?? importDraft?.direction ?? "long",
    setupId: trade?.setupId ?? setups.find((setup) => setup.name.toLowerCase() === importDraft?.setupName?.toLowerCase())?.id ?? "",
    setupDescription: trade?.setupDescription ?? importDraft?.setupDescription ?? "",
    tagIds: trade?.tags.map((tag) => tag.id) ?? tags.filter((tag) => importDraft?.tagNames.some((name) => name.toLowerCase() === tag.name.toLowerCase())).map((tag) => tag.id),
    riskAmount: trade?.riskAmount ?? importDraft?.riskAmount ?? 0,
    outcome: trade?.outcome ?? importDraft?.outcome ?? "win",
    resultAmount: (trade?.outcome ?? importDraft?.outcome) === "loss"
      ? (trade?.riskAmount ?? importDraft?.riskAmount ?? 0)
      : Math.abs(trade?.pnlAmount ?? importDraft?.resultAmount ?? 0),
    noteHtml: trade?.noteHtml ?? importDraft?.noteHtml ?? "",
  })

  const [draft, setDraft] = useState<TradeFormValues>(emptyDraft)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(trade?.image?.url ?? importDraft?.image?.url ?? null)
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
  }, [open, trade?.id, importDraft?.id, selectedDay])

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
      .find((item) => item.kind === "file" && ["image/jpeg", "image/png", "image/webp"].includes(item.type))
      ?.getAsFile()
    if (!pastedImage) return
    event.preventDefault()
    handleImage(pastedImage)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.symbol.trim()) return setError("Enter an instrument or symbol.")
    if (!Number.isFinite(draft.riskAmount) || draft.riskAmount <= 0) return setError("Risk must be greater than zero.")
    if (draft.outcome !== "breakeven" && draft.resultAmount <= 0) return setError("Enter how much the trade won or lost.")
    setSaving(true)
    setError("")
    try {
      await onSave({ ...draft, symbol: draft.symbol.trim().toUpperCase(), resultAmount: draft.outcome === "loss" ? draft.riskAmount : draft.outcome === "breakeven" ? 0 : draft.resultAmount }, image, removeImage)
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
          <DialogTitle>{trade ? "Edit trade" : importDraft ? "Review Codex draft" : "Log a trade"}</DialogTitle>
          <DialogDescription>{importDraft ? "Check the highlighted facts before adding this draft to your journal." : "Capture the decision while it is still fresh."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} onPaste={handlePaste} className="trade-form">
          <div className="trade-form-scroll space-y-5">
          {importDraft && (importDraft.missingFields.length > 0 || importDraft.uncertainFields.length > 0) && (
            <div className="rounded-lg border border-amber-400/45 bg-amber-400/10 px-3 py-3 text-sm text-foreground" role="status">
              <strong>Needs review:</strong> {[...new Set([...importDraft.missingFields, ...importDraft.uncertainFields])].join(", ")}.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date and time" htmlFor="tradedAt">
              <DateTimeField id="tradedAt" value={draft.tradedAt} onChange={(tradedAt) => setDraft({ ...draft, tradedAt })} />
            </Field>
            <Field label="Instrument" htmlFor="symbol">
              <Select aria-label="Instrument" value={draft.symbol || undefined} onValueChange={(value) => setDraft({ ...draft, symbol: value })}>
                <SelectTrigger id="symbol" className="w-full"><SelectValue placeholder="Choose an instrument" /></SelectTrigger>
                <SelectContent>{["NQ", "ES", "MNQ", "MES"].map((symbol) => <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Direction" htmlFor="direction">
              <Select aria-label="Direction" value={draft.direction} onValueChange={(value) => setDraft({ ...draft, direction: value as TradeDirection })}>
                <SelectTrigger id="direction" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="long">Long</SelectItem><SelectItem value="short">Short</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Setup" htmlFor="setup">
              <Select aria-label="Setup" value={draft.setupId || "none"} onValueChange={(value) => setDraft({ ...draft, setupId: value === "none" ? "" : value })}>
                <SelectTrigger id="setup" className="w-full"><SelectValue placeholder="Choose a setup" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No setup</SelectItem>{setups.map((setup) => <SelectItem value={setup.id} key={setup.id}>{setup.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Setup description" htmlFor="setup-description">
            <Textarea id="setup-description" rows={3} placeholder="London low sweep → bullish SMT → 1m IFVG" value={draft.setupDescription} onChange={(event) => setDraft({ ...draft, setupDescription: event.target.value })} />
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Outcome</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["win", "loss", "breakeven"] as TradeOutcome[]).map((outcome) => (
                <button
                  key={outcome}
                  type="button"
                  aria-pressed={draft.outcome === outcome}
                  onClick={() => setDraft({ ...draft, outcome, resultAmount: outcome === "loss" ? draft.riskAmount : outcome === "breakeven" ? 0 : draft.resultAmount })}
                  className={cn("outcome-choice", draft.outcome === outcome && outcomeStyle[outcome])}
                >
                  <OutcomeIcon outcome={outcome} />
                  <span className="capitalize">{outcome}</span>
                  {draft.outcome === outcome && <Check className="ml-auto size-4" />}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Risked (${profile.defaultCurrency})`} htmlFor="riskAmount">
              <Input id="riskAmount" type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.riskAmount || ""} onChange={(event) => { const riskAmount = Number(event.target.value); setDraft({ ...draft, riskAmount, resultAmount: draft.outcome === "loss" ? riskAmount : draft.resultAmount }) }} required />
            </Field>
            <Field label={draft.outcome === "win" ? "Amount won" : draft.outcome === "loss" ? "Amount lost (same as risk)" : "Result"} htmlFor="resultAmount">
              <div className="relative">
                <Input id="resultAmount" type="number" min="0" step="0.01" inputMode="decimal" disabled={draft.outcome === "loss" || draft.outcome === "breakeven"} value={draft.outcome === "loss" ? draft.riskAmount || "" : draft.outcome === "breakeven" ? 0 : draft.resultAmount || ""} onChange={(event) => setDraft({ ...draft, resultAmount: Number(event.target.value) })} className="pr-20" required />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                  {formatR(calculateRMultiple(signedPnl(draft.outcome, draft.resultAmount), draft.riskAmount))}
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
                  <label key={tag.id} className={cn("tag-choice", selected && "border-[var(--accent-cyan)] bg-[var(--accent-cyan-soft)] text-[var(--accent-cyan)]")}>
                    <Checkbox checked={selected} onCheckedChange={(checked) => setDraft({ ...draft, tagIds: checked ? [...draft.tagIds, tag.id] : draft.tagIds.filter((id) => id !== tag.id) })} />
                    {tag.name}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <Field label="Thought process" htmlFor="note-editor">
            <RichTextEditor value={draft.noteHtml} onChange={(noteHtml) => setDraft({ ...draft, noteHtml })} />
          </Field>

          <Field label="Screenshot" htmlFor="image">
            {imagePreview ? (
              <div>
                <div className="relative overflow-hidden rounded-lg border border-border bg-black/20">
                  <img src={imagePreview} alt="Trade screenshot preview" className="max-h-48 w-full object-cover" />
                  <Button type="button" variant="secondary" size="icon-sm" className="absolute right-2 top-2" onClick={() => { setImage(null); setImagePreview(null); setRemoveImage(true) }} aria-label="Remove screenshot"><X /></Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Paste another image with Ctrl+V to replace it.</p>
              </div>
            ) : (
              <label htmlFor="image" className="image-drop">
                <ImagePlus className="size-5 text-[var(--accent-cyan)]" />
                <span><strong>Choose a file or paste a screenshot</strong><small>Press Ctrl+V anywhere in this form · JPEG, PNG or WebP · 10 MB max</small></span>
                <Input id="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleImage(event.target.files?.[0])} />
              </label>
            )}
          </Field>

          {error && <p role="alert" className="rounded-lg border border-[var(--loss-border)] bg-[var(--loss-soft)] px-3 py-2 text-sm text-[var(--loss)]">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : trade ? "Save changes" : importDraft ? "Add to journal" : "Add trade"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>
}

function TradeRow({ trade, onClick }: { trade: Trade; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="trade-row w-full text-left">
      <div className={cn("trade-direction", trade.direction === "long" ? "text-[var(--success)]" : "text-[var(--loss)]")}>
        {trade.direction === "long" ? <ArrowUpRight /> : <ArrowDownRight />}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2"><span className="font-semibold">{trade.symbol}</span><span className="text-xs uppercase tracking-wide text-muted-foreground">{trade.direction}</span></div>
        <p className="truncate text-sm text-muted-foreground">{trade.setupName ?? "No setup"} · {format(parseISO(trade.tradedAt), "dd MMM, HH:mm")}</p>
      </div>
      <OutcomeBadge outcome={trade.outcome} />
      <div className="ml-auto text-right">
        <p className={cn("font-mono font-semibold", trade.pnlAmount > 0 && "text-[var(--success)]", trade.pnlAmount < 0 && "text-[var(--loss)]")}>{formatMoney(trade.pnlAmount, trade.currency)}</p>
        <p className="font-mono text-xs text-muted-foreground">{formatR(trade.rMultiple)}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  )
}

function CalendarView({
  trades,
  currency,
  onSelectDay,
  onSelectTrade,
}: {
  trades: Trade[]
  currency: string
  onSelectDay: (day: Date) => void
  onSelectTrade: (trade: Trade) => void
}) {
  const [view, setView] = useState<"week" | "month">("month")
  const [anchor, setAnchor] = useState(new Date())
  const days = calendarDays(anchor, view)
  const rangeTrades = trades.filter((trade) => {
    const date = parseISO(trade.tradedAt)
    return date >= days[0] && date <= addDays(days.at(-1)!, 1)
  })
  const summary = aggregateTrades(rangeTrades)
  const todayTrades = tradesForDay(trades, new Date())
  const winRate = summary.count ? (summary.win / summary.count) * 100 : 0

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`${view === "week" ? "Weekly" : "Monthly"} net P&L`} value={formatMoney(summary.pnl, currency)} meta={`${summary.count} ${summary.count === 1 ? "trade" : "trades"}`} tone={summary.pnl > 0 ? "positive" : summary.pnl < 0 ? "negative" : "neutral"} />
        <StatCard label="Total R" value={formatR(summary.r)} meta="Risk-adjusted return" tone={summary.r > 0 ? "positive" : summary.r < 0 ? "negative" : "neutral"} />
        <StatCard label="Win rate" value={`${winRate.toFixed(0)}%`} meta={`${summary.win}W · ${summary.loss}L · ${summary.breakeven}B/E`} />
        <StatCard label="Today" value={formatMoney(aggregateTrades(todayTrades).pnl, currency)} meta={`${todayTrades.length} ${todayTrades.length === 1 ? "trade" : "trades"}`} tone={aggregateTrades(todayTrades).pnl > 0 ? "positive" : aggregateTrades(todayTrades).pnl < 0 ? "negative" : "neutral"} />
      </div>

      <section className="calendar-shell" aria-label={`${view} trading calendar`}>
        <div className="calendar-toolbar">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setAnchor(shiftAnchor(anchor, view, -1))} aria-label={`Previous ${view}`}><ChevronLeft /></Button>
            <Button variant="ghost" size="icon" onClick={() => setAnchor(shiftAnchor(anchor, view, 1))} aria-label={`Next ${view}`}><ChevronRight /></Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Today</Button>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{periodLabel(anchor, view)}</h2>
          <Tabs value={view} onValueChange={(value) => setView(value as "week" | "month")}>
            <TabsList><TabsTrigger value="week">Week</TabsTrigger><TabsTrigger value="month">Month</TabsTrigger></TabsList>
          </Tabs>
        </div>
        <div className="grid grid-cols-7 border-y border-border bg-[var(--surface-2)]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="calendar-weekday">{day}</div>)}
        </div>
        <div className={cn("calendar-grid", view === "week" && "calendar-grid-week")}>
          {days.map((day) => {
            const dayTrades = tradesForDay(trades, day)
            const daySummary = aggregateTrades(dayTrades)
            const outside = view === "month" && !isSameMonth(day, anchor)
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn("calendar-day", outside && "calendar-day-outside", isSameDay(day, new Date()) && "calendar-day-today")}
                aria-label={`${format(day, "EEEE d MMMM")}, ${dayTrades.length} trades, ${formatMoney(daySummary.pnl, currency)}`}
              >
                <span className="calendar-date">{format(day, "d")}</span>
                {dayTrades.length > 0 ? (
                  <>
                    <span className={cn("calendar-pnl", daySummary.pnl > 0 && "text-[var(--success)]", daySummary.pnl < 0 && "text-[var(--loss)]")}>{formatMoney(daySummary.pnl, currency)}</span>
                    <span className="calendar-count">{dayTrades.length} {dayTrades.length === 1 ? "trade" : "trades"}</span>
                    {view === "week" && <span className="calendar-r">{formatR(daySummary.r)}</span>}
                  </>
                ) : <span className="calendar-empty">No trades</span>}
              </button>
            )
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header"><div><h2 className="font-semibold">Recent trades</h2><p className="text-sm text-muted-foreground">Your latest decisions and outcomes.</p></div></div>
        <div>{trades.slice().sort((a, b) => b.tradedAt.localeCompare(a.tradedAt)).slice(0, 4).map((trade) => <TradeRow key={trade.id} trade={trade} onClick={() => onSelectTrade(trade)} />)}</div>
      </section>
    </div>
  )
}

function TradesView({ trades, onSelectTrade }: { trades: Trade[]; onSelectTrade: (trade: Trade) => void }) {
  const [query, setQuery] = useState("")
  const [outcome, setOutcome] = useState("all")
  const filtered = trades
    .filter((trade) => !query || `${trade.symbol} ${trade.setupName ?? ""} ${trade.tags.map((tag) => tag.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .filter((trade) => outcome === "all" || trade.outcome === outcome)
    .sort((a, b) => b.tradedAt.localeCompare(a.tradedAt))

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header gap-3 max-sm:flex-col max-sm:items-stretch">
        <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol, setup or tag" className="pl-9" aria-label="Search trades" /></div>
        <Select aria-label="Outcome filter" value={outcome} onValueChange={setOutcome}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All outcomes</SelectItem><SelectItem value="win">Wins</SelectItem><SelectItem value="loss">Losses</SelectItem><SelectItem value="breakeven">Breakeven</SelectItem></SelectContent></Select>
      </div>
      <div>{filtered.length ? filtered.map((trade) => <TradeRow key={trade.id} trade={trade} onClick={() => onSelectTrade(trade)} />) : <div className="empty-state"><Search /><h3>No matching trades</h3><p>Try changing the search or outcome filter.</p></div>}</div>
    </section>
  )
}

function OrganiseView({ setups, tags, onAdd, onDelete }: { setups: Setup[]; tags: Tag[]; onAdd: (type: "setup" | "tag", name: string) => Promise<void>; onDelete: (type: "setup" | "tag", id: string) => Promise<void> }) {
  const [setupName, setSetupName] = useState("")
  const [tagName, setTagName] = useState("")
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel p-5"><h2 className="font-semibold">Setups</h2><p className="mt-1 text-sm text-muted-foreground">Name the patterns you deliberately trade.</p><form className="mt-5 flex gap-2" onSubmit={async (event) => { event.preventDefault(); if (setupName.trim()) { await onAdd("setup", setupName.trim()); setSetupName("") } }}><Input value={setupName} onChange={(event) => setSetupName(event.target.value)} placeholder="New setup" aria-label="New setup name" /><Button type="submit" size="icon" aria-label="Add setup"><Plus /></Button></form><div className="mt-5 space-y-2">{setups.map((setup) => <div key={setup.id} className="organise-row"><span>{setup.name}</span><Button variant="ghost" size="icon-sm" onClick={() => onDelete("setup", setup.id)} aria-label={`Delete ${setup.name}`}><Trash2 /></Button></div>)}</div></section>
      <section className="panel p-5"><h2 className="font-semibold">Tags</h2><p className="mt-1 text-sm text-muted-foreground">Track emotions, mistakes and conditions.</p><form className="mt-5 flex gap-2" onSubmit={async (event) => { event.preventDefault(); if (tagName.trim()) { await onAdd("tag", tagName.trim()); setTagName("") } }}><Input value={tagName} onChange={(event) => setTagName(event.target.value)} placeholder="New tag" aria-label="New tag name" /><Button type="submit" size="icon" aria-label="Add tag"><Plus /></Button></form><div className="mt-5 space-y-2">{tags.map((tag) => <div key={tag.id} className="organise-row"><span className="flex items-center gap-2"><span className="status-pip bg-[var(--accent-cyan)]" />{tag.name}</span><Button variant="ghost" size="icon-sm" onClick={() => onDelete("tag", tag.id)} aria-label={`Delete ${tag.name}`}><Trash2 /></Button></div>)}</div></section>
    </div>
  )
}

function InboxView({ drafts, onReview, onDelete }: { drafts: CodexDraft[]; onReview: (draft: CodexDraft) => void; onDelete: (draft: CodexDraft) => Promise<void> }) {
  if (!drafts.length) return <section className="panel"><div className="empty-state"><Inbox /><h3>Your Codex inbox is clear</h3><p>Complete voice and screenshot imports are added automatically. Anything uncertain waits here.</p></div></section>
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan-soft)] px-4 py-3 text-sm text-muted-foreground"><strong className="text-foreground">Drafts never affect your totals.</strong> Review the missing facts before adding one to the journal.</div>
      {drafts.map((draft) => {
        const needs = [...new Set([...draft.missingFields, ...draft.uncertainFields])]
        return <section key={draft.id} className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="flex items-center gap-2"><span className="trade-direction text-[var(--accent-cyan)]"><Sparkles /></span><div><h2 className="font-semibold">{draft.symbol || "Instrument missing"}{draft.direction ? ` · ${draft.direction}` : ""}</h2><p className="text-xs text-muted-foreground">Received {format(parseISO(draft.createdAt), "d MMM, HH:mm")}</p></div></div></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => onReview(draft)}><Pencil /> Review draft</Button><Button variant="ghost" className="text-[var(--loss)]" onClick={() => void onDelete(draft)} aria-label="Delete draft"><Trash2 /></Button></div>
          </div>
          {draft.setupDescription && <p className="mt-4 rounded-lg border border-border bg-[var(--surface-2)] px-3 py-2 text-sm">{draft.setupDescription}</p>}
          <div className="mt-4 flex flex-wrap gap-2">{needs.map((field) => <Badge key={field} variant="outline" className="border-amber-400/45 bg-amber-400/10 text-foreground">Needs {field}</Badge>)}{draft.warnings.map((warning) => <Badge key={warning} variant="outline">{warning}</Badge>)}</div>
        </section>
      })}
    </div>
  )
}

const themeOptions = [
  { id: "midnight", name: "Midnight", description: "Cyan glass and deep navy", swatches: ["#080c11", "#17212d", "#5ce1e6"] },
  { id: "obsidian", name: "Obsidian", description: "Black, graphite and signal green", swatches: ["#050807", "#14201b", "#53e3a6"] },
  { id: "violet", name: "Violet Horizon", description: "Deep indigo and ultraviolet", swatches: ["#090815", "#211d38", "#a99cff"] },
  { id: "alloy", name: "Light Alloy", description: "Bright technical workspace", swatches: ["#edf2f7", "#ffffff", "#126e82"] },
] as const

const accentOptions = [
  { id: "theme", name: "Theme", color: "linear-gradient(135deg,#5ce1e6,#a99cff)" },
  { id: "cyan", name: "Cyan", color: "#5ce1e6" },
  { id: "emerald", name: "Emerald", color: "#53e3a6" },
  { id: "violet", name: "Violet", color: "#a99cff" },
  { id: "amber", name: "Amber", color: "#f3bb55" },
] as const

function SettingsView({ profile, setProfile, onSave, onBackup, onRestore, dataLocation, codexStatus, onEnableCodex, onDisableCodex, onOpenInbox }: { profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>>; onSave: () => Promise<void>; onBackup: () => Promise<void>; onRestore: () => Promise<void>; dataLocation: string; codexStatus: CodexIntegrationStatus | null; onEnableCodex: () => Promise<void>; onDisableCodex: () => Promise<void>; onOpenInbox: () => Promise<void> }) {
  const [saved, setSaved] = useState(false)
  const [confirmEnable, setConfirmEnable] = useState(false)
  const [helperBusy, setHelperBusy] = useState(false)
  return (
    <div className="max-w-2xl space-y-5">
    <section className="panel p-6">
      <h2 className="font-semibold">Profile preferences</h2><p className="mt-1 text-sm text-muted-foreground">New trades inherit these defaults. Historical currencies never change.</p>
      <form className="mt-6 space-y-5" onSubmit={async (event) => { event.preventDefault(); try { await onSave(); setSaved(true); setTimeout(() => setSaved(false), 1800) } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save settings.") } }}>
        <Field label="Display name" htmlFor="display-name"><Input id="display-name" value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Default currency" htmlFor="currency"><Select aria-label="Default currency" value={profile.defaultCurrency} onValueChange={(value) => setProfile({ ...profile, defaultCurrency: value })}><SelectTrigger id="currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["GBP", "USD", "EUR", "CAD", "AUD"].map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent></Select></Field><Field label="Timezone" htmlFor="timezone"><Input id="timezone" value={profile.timezone} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} /></Field></div>
        <div className="flex items-center gap-3"><Button type="submit">Save settings</Button>{saved && <span role="status" className="flex items-center gap-1 text-sm text-[var(--success)]"><Check className="size-4" /> Saved</span>}</div>
      </form>
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="font-semibold">Backup and restore</h3>
        <p className="mt-1 text-sm text-muted-foreground">A backup contains every trade, note, setup, tag, preference, and screenshot.</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={onBackup}><Download /> Back up journal</Button><Button variant="outline" onClick={onRestore}><Upload /> Restore backup</Button></div>
        <div className="mt-5 rounded-lg border border-border bg-[var(--surface-2)] p-3"><p className="flex items-center gap-2 text-sm font-medium"><HardDrive className="size-4 text-[var(--accent-cyan)]" /> Stored only on this computer</p><p className="mt-1 break-all text-xs text-muted-foreground">{dataLocation || "Your private app data folder"}</p></div>
      </div>
    </section>
    <section className="panel p-6">
      <h2 className="font-semibold">Appearance</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">Choose a visual system, then tune how dense and animated the journal feels. Changes preview immediately.</p>
      <fieldset className="mt-5"><legend className="detail-label mb-3">Visual theme</legend><div className="grid gap-3 sm:grid-cols-2">{themeOptions.map((theme) => <button key={theme.id} type="button" aria-pressed={profile.theme === theme.id} onClick={() => setProfile({ ...profile, theme: theme.id })} className={cn("theme-choice", profile.theme === theme.id && "theme-choice-active")}><span className="theme-swatches" aria-hidden="true">{theme.swatches.map((color) => <span key={color} style={{ background: color }} />)}</span><span><strong>{theme.name}</strong><small>{theme.description}</small></span>{profile.theme === theme.id && <Check className="ml-auto size-4" />}</button>)}</div></fieldset>
      <fieldset className="mt-5"><legend className="detail-label mb-3">Accent colour</legend><div className="flex flex-wrap gap-2">{accentOptions.map((accent) => <button key={accent.id} type="button" aria-pressed={profile.accent === accent.id} onClick={() => setProfile({ ...profile, accent: accent.id })} className={cn("accent-choice", profile.accent === accent.id && "accent-choice-active")}><span style={{ background: accent.color }} aria-hidden="true" />{accent.name}</button>)}</div></fieldset>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Information density" htmlFor="density"><Select aria-label="Information density" value={profile.density} onValueChange={(value) => setProfile({ ...profile, density: value as Profile["density"] })}><SelectTrigger id="density" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="comfortable">Comfortable</SelectItem><SelectItem value="compact">Compact</SelectItem></SelectContent></Select></Field>
        <Field label="Corner style" htmlFor="corners"><Select aria-label="Corner style" value={profile.corners} onValueChange={(value) => setProfile({ ...profile, corners: value as Profile["corners"] })}><SelectTrigger id="corners" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rounded">Rounded</SelectItem><SelectItem value="soft">Extra soft</SelectItem><SelectItem value="sharp">Technical</SelectItem></SelectContent></Select></Field>
        <Field label="Interface type" htmlFor="font-mode"><Select aria-label="Interface type" value={profile.fontMode} onValueChange={(value) => setProfile({ ...profile, fontMode: value as Profile["fontMode"] })}><SelectTrigger id="font-mode" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="clean">Clean sans</SelectItem><SelectItem value="technical">Technical mono</SelectItem></SelectContent></Select></Field>
        <Field label="Interface motion" htmlFor="motion"><Select aria-label="Interface motion" value={profile.motion} onValueChange={(value) => setProfile({ ...profile, motion: value as Profile["motion"] })}><SelectTrigger id="motion" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="system">Follow Windows</SelectItem><SelectItem value="reduced">Reduced</SelectItem></SelectContent></Select></Field>
        <Field label="Glow intensity" htmlFor="glow"><Select aria-label="Glow intensity" value={profile.glow} onValueChange={(value) => setProfile({ ...profile, glow: value as Profile["glow"] })}><SelectTrigger id="glow" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="off">Off</SelectItem><SelectItem value="subtle">Subtle</SelectItem><SelectItem value="bright">Bright</SelectItem></SelectContent></Select></Field>
      </div>
      <div className="mt-5 flex items-center gap-3"><Button onClick={async () => { try { await onSave(); setSaved(true); setTimeout(() => setSaved(false), 1800) } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save appearance.") } }}>Save appearance</Button>{saved && <span role="status" className="flex items-center gap-1 text-sm text-[var(--success)]"><Check className="size-4" /> Saved</span>}</div>
    </section>
    <section className="panel p-6">
      <div className="flex items-start gap-3"><div className="trade-direction text-[var(--accent-cyan)]"><Sparkles /></div><div><h2 className="font-semibold">Codex helper</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Dictate a trade or attach a chart in Codex. Complete entries save automatically; uncertain ones wait safely in the Inbox.</p></div></div>
      <div className="mt-5 rounded-lg border border-border bg-[var(--surface-2)] p-4"><p className="text-sm font-medium">{codexStatus?.enabled ? "Enabled on this computer" : "Not enabled"}</p><p className="mt-1 break-all text-xs text-muted-foreground">{codexStatus?.inboxPath || "The local inbox will be created under Documents\\Codex."}</p></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => setConfirmEnable(true)} disabled={helperBusy}>{codexStatus?.enabled ? <><RotateCcw /> Reinstall helper</> : <><Sparkles /> Enable Codex helper</>}</Button>
        <Button variant="outline" onClick={() => void onOpenInbox()}><FolderOpen /> Open inbox folder</Button>
        {codexStatus?.enabled && <Button variant="ghost" onClick={async () => { setHelperBusy(true); try { await onDisableCodex() } finally { setHelperBusy(false) } }}>Disable helper</Button>}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Enabling copies one local skill into Codex. It does not connect a broker or upload your journal. Restart Codex once after enabling.</p>
    </section>
    <Dialog open={confirmEnable} onOpenChange={setConfirmEnable}>
      <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{codexStatus?.enabled ? "Reinstall Codex helper?" : "Enable Codex helper?"}</DialogTitle><DialogDescription>This installs the local trading-journal-log skill and creates a watched inbox in Documents\\Codex. The skill can prepare entries but cannot write directly to your journal database.</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" onClick={() => setConfirmEnable(false)}>Cancel</Button><Button onClick={async () => { setHelperBusy(true); try { await onEnableCodex(); setConfirmEnable(false); toast.success("Codex helper enabled", { description: "Restart Codex once before using it." }) } catch (error) { toast.error(error instanceof Error ? error.message : "Could not enable the helper.") } finally { setHelperBusy(false) } }}>{helperBusy ? "Installing…" : "Enable helper"}</Button></DialogFooter></DialogContent>
    </Dialog>
    </div>
  )
}

function JournalWorkspace({ initial, api }: { initial: JournalBootstrap; api: JournalDesktopApi }) {
  const [page, setPage] = useState<Page>("calendar")
  const [trades, setTrades] = useState(initial.trades)
  const [setups, setSetups] = useState(initial.setups)
  const [tags, setTags] = useState(initial.tags)
  const [drafts, setDrafts] = useState(initial.drafts)
  const [profile, setProfile] = useState(initial.profile)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [editingDraft, setEditingDraft] = useState<CodexDraft | null>(null)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [newTradeDay, setNewTradeDay] = useState<Date | null>(null)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [deleteTrade, setDeleteTrade] = useState<Trade | null>(null)
  const [dataLocation, setDataLocation] = useState("")
  const [codexStatus, setCodexStatus] = useState<CodexIntegrationStatus | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    api.dataLocation().then(setDataLocation).catch(() => setDataLocation("Your private app data folder"))
    api.codexStatus().then(setCodexStatus).catch(() => setCodexStatus(null))
  }, [api])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = profile.theme
    root.dataset.accent = profile.accent
    root.dataset.density = profile.density
    root.dataset.corners = profile.corners
    root.dataset.font = profile.fontMode
    root.dataset.motion = profile.motion
    root.dataset.glow = profile.glow
    root.style.colorScheme = profile.theme === "alloy" ? "light" : "dark"
    api.setWindowChrome(profile.theme).catch(() => undefined)
  }, [api, profile.theme, profile.accent, profile.density, profile.corners, profile.fontMode, profile.motion, profile.glow])

  useEffect(() => api.onCodexImport((receipt: CodexImportReceipt) => {
    api.load().then((data) => {
      setTrades(data.trades); setSetups(data.setups); setTags(data.tags); setDrafts(data.drafts)
      if (receipt.status === "saved") {
        const imported = data.trades.find((trade) => trade.id === receipt.tradeId)
        toast.success(imported ? `${imported.symbol} ${imported.direction} saved: ${formatMoney(imported.pnlAmount, imported.currency)}, ${formatR(imported.rMultiple)}` : receipt.message, {
          action: { label: "Undo", onClick: () => { void api.undoImport(receipt.importId).then(() => api.load()).then((fresh) => { setTrades(fresh.trades); setDrafts(fresh.drafts); toast.success("Import undone") }) } },
        })
      } else if (receipt.status === "draft") {
        toast.info("Codex entry saved as a draft", { description: receipt.message, action: { label: "View", onClick: () => setPage("inbox") } })
      } else if (receipt.status === "rejected") toast.error("Codex import rejected", { description: receipt.message })
    }).catch(() => toast.error("The journal changed, but the screen could not refresh."))
  }), [api])

  const currentSelectedTrade = selectedTrade ? trades.find((trade) => trade.id === selectedTrade.id) ?? null : null
  const dayTrades = selectedDay ? tradesForDay(trades, selectedDay).sort((a, b) => b.tradedAt.localeCompare(a.tradedAt)) : []

  const openNewTrade = (day: Date | null = null) => {
    setEditingTrade(null)
    setEditingDraft(null)
    setNewTradeDay(day)
    setSelectedDay(null)
    setFormOpen(true)
  }

  const saveTrade = async (draft: TradeFormValues, image: File | null, removeImage: boolean) => {
    const pnl = signedPnl(draft.outcome, draft.resultAmount)
    const payload = {
      tradedAt: new Date(draft.tradedAt).toISOString(),
      symbol: draft.symbol,
      direction: draft.direction,
      setupId: draft.setupId || null,
      setupDescription: draft.setupDescription,
      riskAmount: draft.riskAmount,
      outcome: draft.outcome,
      pnlAmount: pnl,
      noteHtml: draft.noteHtml,
      tagIds: draft.tagIds,
    }

    const input = {
      id: editingTrade?.id,
      payload,
      image: image ? { fileName: image.name, contentType: image.type, bytes: new Uint8Array(await image.arrayBuffer()) } : null,
      removeImage,
    }
    const storedTrade = editingDraft ? await api.completeDraft({ ...input, id: undefined, draftId: editingDraft.id }) : await api.saveTrade(input)
    setTrades((items) => editingTrade ? items.map((item) => item.id === storedTrade.id ? storedTrade : item) : [storedTrade, ...items])
    if (editingDraft) setDrafts((items) => items.filter((item) => item.id !== editingDraft.id))
    setEditingTrade(null)
    setEditingDraft(null)
  }

  const duplicateTrade = async (trade: Trade) => {
    const duplicate = await api.duplicateTrade(trade.id)
    setTrades((items) => [duplicate, ...items])
    setSelectedTrade(duplicate)
    toast.success("Trade duplicated")
  }

  const removeTrade = async (trade: Trade) => {
    await api.deleteTrade(trade.id)
    setTrades((items) => items.filter((item) => item.id !== trade.id))
    setSelectedTrade(null)
    setDeleteTrade(null)
  }

  const addMetadata = async (type: "setup" | "tag", name: string) => {
    try {
      const item = await api.addMetadata(type, name)
      if (type === "setup") setSetups((items) => [...items, item as Setup])
      else setTags((items) => [...items, item as Tag])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that item.")
      return
    }
  }

  const deleteMetadata = async (type: "setup" | "tag", id: string) => {
    await api.deleteMetadata(type, id)
    if (type === "setup") setSetups((items) => items.filter((item) => item.id !== id))
    else setTags((items) => items.filter((item) => item.id !== id))
  }

  const saveProfile = async () => {
    const storedProfile = await api.saveProfile(profile)
    setProfile(storedProfile)
  }

  const backup = async () => {
    const result = await api.backup()
    if (!result.canceled) toast.success("Backup saved", { description: result.filePath })
  }

  const restore = async () => {
    const result = await api.restore()
    if (result.canceled || !result.data) return
    setTrades(result.data.trades)
    setSetups(result.data.setups)
    setTags(result.data.tags)
    setProfile(result.data.profile)
    setDrafts(result.data.drafts)
    setSelectedTrade(null)
    setSelectedDay(null)
    toast.success("Backup restored")
  }

  const deleteCodexDraft = async (draft: CodexDraft) => {
    await api.deleteDraft(draft.id)
    setDrafts((items) => items.filter((item) => item.id !== draft.id))
    toast.success("Draft deleted")
  }

  const enableCodex = async () => setCodexStatus(await api.enableCodex())
  const disableCodex = async () => { setCodexStatus(await api.disableCodex()); toast.success("Codex helper disabled") }

  return (
    <div className={cn("app-frame min-h-screen bg-background text-foreground", sidebarCollapsed && "sidebar-collapsed")}>
      <a href="#main-content" className="skip-link">Skip to journal</a>
      <div className="app-titlebar">
        <div className="titlebar-brand"><span className="brand-glyph">J</span><strong>Trading Journal</strong></div>
        <div className="titlebar-status"><span className="status-pip bg-[var(--success)]" /><span>Private · saved locally</span></div>
        <div className="window-controls-space" aria-hidden="true" />
      </div>
      <aside className="app-sidebar">
        <Button variant="ghost" size="icon-sm" className="sidebar-toggle" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}>{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
        <nav className="mt-3 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" title={sidebarCollapsed ? item.label : undefined} onClick={() => setPage(item.id)} className={cn("nav-item", page === item.id && "nav-item-active")} aria-current={page === item.id ? "page" : undefined}><Icon /><span>{item.label}</span>{item.id === "inbox" && drafts.length > 0 && <span className="nav-count" aria-label={`${drafts.length} drafts`}>{drafts.length}</span>}</button> })}
        </nav>
        <div className="sidebar-foot"><div className="account-chip"><span className="account-avatar">{profile.displayName.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><strong className="truncate">{profile.displayName}</strong><small className="truncate">Offline · this computer</small></span><HardDrive className="ml-auto size-4 text-[var(--accent-cyan)]" aria-hidden="true" /></div></div>
      </aside>

      <div className="app-content">
        <header className="app-header">
          <div><p className="eyebrow">{format(new Date(), "EEEE, d MMMM")}</p><div className="flex items-baseline gap-3"><h1>{pageCopy[page].title}</h1><p>{pageCopy[page].description}</p></div></div>
          <Button size="lg" onClick={() => openNewTrade()}><Plus /> Log trade</Button>
        </header>
        <main id="main-content" className="main-workspace" tabIndex={-1}>
          {page === "calendar" && <CalendarView trades={trades} currency={profile.defaultCurrency} onSelectDay={setSelectedDay} onSelectTrade={setSelectedTrade} />}
          {page === "trades" && <TradesView trades={trades} onSelectTrade={setSelectedTrade} />}
          {page === "inbox" && <InboxView drafts={drafts} onReview={(draft) => { setEditingTrade(null); setEditingDraft(draft); setFormOpen(true) }} onDelete={deleteCodexDraft} />}
          {page === "organise" && <OrganiseView setups={setups} tags={tags} onAdd={addMetadata} onDelete={deleteMetadata} />}
          {page === "settings" && <SettingsView profile={profile} setProfile={setProfile} onSave={saveProfile} onBackup={backup} onRestore={restore} dataLocation={dataLocation} codexStatus={codexStatus} onEnableCodex={enableCodex} onDisableCodex={disableCodex} onOpenInbox={api.openCodexInbox} />}
        </main>
      </div>

      <TradeFormDialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) { setEditingTrade(null); setEditingDraft(null); setNewTradeDay(null) } }} profile={profile} setups={setups} tags={tags} trade={editingTrade} importDraft={editingDraft} selectedDay={newTradeDay} onSave={saveTrade} />

      <Sheet open={Boolean(selectedDay)} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent className="w-full overflow-y-auto border-[var(--border-strong)] bg-[var(--surface-1)] sm:max-w-lg">
          <SheetHeader><SheetTitle>{selectedDay ? format(selectedDay, "EEEE, d MMMM") : "Trading day"}</SheetTitle><SheetDescription>{dayTrades.length ? `${dayTrades.length} ${dayTrades.length === 1 ? "trade" : "trades"} · ${formatMoney(aggregateTrades(dayTrades).pnl, profile.defaultCurrency)}` : "No trades logged."}</SheetDescription>{selectedDay && <Button className="mt-4" onClick={() => openNewTrade(selectedDay)}><Plus /> Log a trade for this day</Button>}</SheetHeader>
          <div className="border-t border-border">{dayTrades.map((trade) => <TradeRow key={trade.id} trade={trade} onClick={() => setSelectedTrade(trade)} />)}{!dayTrades.length && <div className="empty-state"><CalendarDays /><h3>Clear day</h3><p>No trades were logged on this date.</p></div>}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(currentSelectedTrade)} onOpenChange={(open) => !open && setSelectedTrade(null)}>
        <SheetContent className="w-full overflow-y-auto border-[var(--border-strong)] bg-[var(--surface-1)] sm:max-w-xl">
          {currentSelectedTrade && <>
            <SheetHeader><div className="flex items-start gap-3 pr-8"><div className={cn("trade-direction size-11", currentSelectedTrade.direction === "long" ? "text-[var(--success)]" : "text-[var(--loss)]")}>{currentSelectedTrade.direction === "long" ? <ArrowUpRight /> : <ArrowDownRight />}</div><div><SheetTitle className="text-xl">{currentSelectedTrade.symbol}</SheetTitle><SheetDescription className="mt-1 capitalize">{currentSelectedTrade.direction} · {format(parseISO(currentSelectedTrade.tradedAt), "d MMMM yyyy, HH:mm")}</SheetDescription></div></div></SheetHeader>
            <div className="space-y-6 border-t border-border p-5">
              <div className="grid grid-cols-3 gap-3"><DetailMetric label="Outcome"><OutcomeBadge outcome={currentSelectedTrade.outcome} /></DetailMetric><DetailMetric label="Net P&L"><span className={cn("font-mono font-semibold", currentSelectedTrade.pnlAmount > 0 && "text-[var(--success)]", currentSelectedTrade.pnlAmount < 0 && "text-[var(--loss)]")}>{formatMoney(currentSelectedTrade.pnlAmount, currentSelectedTrade.currency)}</span></DetailMetric><DetailMetric label="R-multiple"><span className="font-mono font-semibold">{formatR(currentSelectedTrade.rMultiple)}</span></DetailMetric></div>
              <div className="grid grid-cols-2 gap-4 border-y border-border py-4"><div><p className="detail-label">Risked</p><p className="mt-1 font-mono">{formatMoney(currentSelectedTrade.riskAmount, currentSelectedTrade.currency)}</p></div><div><p className="detail-label">Setup</p><p className="mt-1">{currentSelectedTrade.setupName ?? "No setup"}</p></div></div>
              {currentSelectedTrade.setupDescription && <div><p className="detail-label mb-2">Setup description</p><p className="rounded-lg border border-border bg-[var(--surface-2)] p-3 text-sm leading-6">{currentSelectedTrade.setupDescription}</p></div>}
              {currentSelectedTrade.tags.length > 0 && <div><p className="detail-label mb-2">Tags</p><div className="flex flex-wrap gap-2">{currentSelectedTrade.tags.map((tag) => <Badge variant="outline" key={tag.id}>{tag.name}</Badge>)}</div></div>}
              <div><p className="detail-label mb-2">Thought process</p><div className="prose-note" dangerouslySetInnerHTML={{ __html: currentSelectedTrade.noteHtml || "<p>No notes added.</p>" }} /></div>
              {currentSelectedTrade.image?.url && <div><p className="detail-label mb-2">Screenshot</p><button type="button" className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setZoomedImage(currentSelectedTrade.image?.url ?? null)} aria-label="Enlarge trade screenshot"><img src={currentSelectedTrade.image.url} alt={`Chart attached to ${currentSelectedTrade.symbol} trade`} className="w-full transition group-hover:opacity-80" /><span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-md bg-black/75 px-3 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"><Maximize2 className="size-4" /> Enlarge</span></button></div>}
              <div className="flex flex-wrap gap-2 border-t border-border pt-5"><Button variant="outline" onClick={() => { setEditingTrade(currentSelectedTrade); setSelectedTrade(null); setFormOpen(true) }}><Pencil /> Edit</Button><Button variant="outline" onClick={() => void duplicateTrade(currentSelectedTrade)}><Copy /> Duplicate</Button><Button variant="ghost" className="ml-auto text-[var(--loss)] hover:bg-[var(--loss-soft)] hover:text-[var(--loss)]" onClick={() => setDeleteTrade(currentSelectedTrade)}><Trash2 /> Delete</Button></div>
            </div>
          </>}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(zoomedImage)} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="w-fit max-w-[95vw] border-0 bg-black p-2" showCloseButton>
          <DialogHeader className="sr-only"><DialogTitle>Trade screenshot</DialogTitle><DialogDescription>Enlarged trade chart image</DialogDescription></DialogHeader>
          {zoomedImage && <img src={zoomedImage} alt="Enlarged trade chart" className="max-h-[88vh] max-w-[90vw] object-contain" />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTrade)} onOpenChange={(open) => !open && setDeleteTrade(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this trade?</AlertDialogTitle><AlertDialogDescription>This permanently removes the trade, its notes, tags, and screenshot. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep trade</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => deleteTrade && removeTrade(deleteTrade)}>Delete trade</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DetailMetric({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="detail-metric"><p className="detail-label">{label}</p><div className="mt-2">{children}</div></div>
}

export function JournalApp() {
  const [initial, setInitial] = useState<JournalBootstrap | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!window.journalApi) {
      Promise.resolve().then(() => setError("Open Trading Journal from the installed desktop app. The browser preview cannot access your private database."))
      return
    }
    window.journalApi.load().then(setInitial).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Could not open the local journal database.")
    })
  }, [])

  if (error) return <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground"><div className="panel max-w-lg p-6"><HardDrive className="size-8 text-[var(--accent-cyan)]" /><h1 className="mt-4 text-xl font-semibold">Desktop app required</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p></div></div>
  if (!initial || !window.journalApi) return <div className="grid min-h-screen place-items-center bg-background text-foreground"><div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="status-pip animate-pulse bg-[var(--accent-cyan)]" /> Opening your private journal…</div></div>
  return <I18nProvider locale="en-GB"><JournalWorkspace initial={initial} api={window.journalApi} /></I18nProvider>
}
