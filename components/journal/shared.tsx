import { format, parseISO } from "date-fns"
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  CircleMinus,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Trade, TradingAccount, TradeOutcome } from "@/lib/types"
import { formatMoney, formatR } from "@/lib/trading"

export const outcomeStyle: Record<TradeOutcome, string> = {
  win: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]",
  loss: "border-[var(--loss-border)] bg-[var(--loss-soft)] text-[var(--loss)]",
  breakeven: "border-border bg-secondary text-muted-foreground",
}

export const accountColors: Record<string, string> = {
  cyan: "#5ce1e6",
  emerald: "#53e3a6",
  violet: "#a99cff",
  amber: "#f3bb55",
}

export function AccountSelect({
  accounts,
  value,
  onChange,
  includeAll = true,
  id,
}: {
  accounts: TradingAccount[]
  value: string
  onChange: (value: string) => void
  includeAll?: boolean
  id?: string
}) {
  return (
    <Select aria-label="Trading account" value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full sm:w-52">
        <SelectValue placeholder="Choose account" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">All accounts</SelectItem>}
        {accounts
          .filter((account) => !account.archived || account.id === value)
          .map((account) => (
            <SelectItem key={account.id} value={account.id} textValue={account.name}>
              <span className="flex items-center gap-2">
                <span className="status-pip" style={{ background: accountColors[account.color] }} />
                {account.name}
              </span>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}

export function OutcomeIcon({ outcome, className }: { outcome: TradeOutcome; className?: string }) {
  const Icon = outcome === "win" ? TrendingUp : outcome === "loss" ? TrendingDown : CircleMinus
  return <Icon className={cn("size-4", className)} aria-hidden="true" />
}

export function OutcomeBadge({ outcome }: { outcome: TradeOutcome }) {
  return (
    <Badge variant="outline" className={cn("capitalize", outcomeStyle[outcome])}>
      <OutcomeIcon outcome={outcome} className="size-3" />
      {outcome}
    </Badge>
  )
}

export function StatCard({
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

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export function TradeRow({ trade, onClick }: { trade: Trade; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="trade-row w-full text-left">
      <div
        className={cn(
          "trade-direction",
          trade.direction === "long" ? "text-[var(--success)]" : "text-[var(--loss)]",
        )}
      >
        {trade.direction === "long" ? <ArrowUpRight /> : <ArrowDownRight />}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{trade.symbol}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {trade.direction}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className="status-pip"
              style={{ background: accountColors[trade.accountColor] }}
            />
            {trade.accountName}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {trade.setupName ?? "No setup"} · {format(parseISO(trade.tradedAt), "dd MMM, HH:mm")}
        </p>
      </div>
      <OutcomeBadge outcome={trade.outcome} />
      <div className="ml-auto text-right">
        <p
          className={cn(
            "font-mono font-semibold",
            trade.pnlAmount > 0 && "text-[var(--success)]",
            trade.pnlAmount < 0 && "text-[var(--loss)]",
          )}
        >
          {formatMoney(trade.pnlAmount, trade.currency)}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{formatR(trade.rMultiple)}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  )
}

export function DetailMetric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detail-metric">
      <p className="detail-label">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
