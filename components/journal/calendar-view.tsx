import { useState } from "react"
import { addDays, format, isSameDay, isSameMonth, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { Trade, TradingAccount } from "@/lib/types"
import {
  aggregateTrades,
  calendarDays,
  formatTradePnl,
  formatR,
  periodLabel,
  shiftAnchor,
  tradesForDay,
} from "@/lib/trading"
import { AccountSelect, StatCard, TradeRow } from "@/components/journal/shared"

export function CalendarView({
  trades,
  accounts,
  selectedAccountId,
  onAccountChange,
  currency,
  onSelectDay,
  onSelectTrade,
}: {
  trades: Trade[]
  accounts: TradingAccount[]
  selectedAccountId: string
  onAccountChange: (id: string) => void
  currency: string
  onSelectDay: (day: Date) => void
  onSelectTrade: (trade: Trade) => void
}) {
  const [view, setView] = useState<"week" | "month">("month")
  const [anchor, setAnchor] = useState(new Date())
  const days = calendarDays({ anchor, view })
  const rangeTrades = trades.filter((trade) => {
    const date = parseISO(trade.tradedAt)
    return date >= days[0] && date <= addDays(days.at(-1)!, 1)
  })
  const summary = aggregateTrades(rangeTrades)
  const todayTrades = tradesForDay({ trades, day: new Date() })
  const winRate = summary.count ? (summary.win / summary.count) * 100 : 0

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <AccountSelect accounts={accounts} value={selectedAccountId} onChange={onAccountChange} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`${view === "week" ? "Weekly" : "Monthly"} net P&L`}
          value={formatTradePnl({ trades: rangeTrades, defaultCurrency: currency })}
          meta={`${summary.count} ${summary.count === 1 ? "trade" : "trades"}`}
          tone={
            new Set(rangeTrades.map((t) => t.currency)).size > 1
              ? "neutral"
              : summary.pnl > 0
                ? "positive"
                : summary.pnl < 0
                  ? "negative"
                  : "neutral"
          }
        />
        <StatCard
          label="Total R"
          value={formatR(summary.r)}
          meta="Risk-adjusted return"
          tone={summary.r > 0 ? "positive" : summary.r < 0 ? "negative" : "neutral"}
        />
        <StatCard
          label="Win rate"
          value={`${winRate.toFixed(0)}%`}
          meta={`${summary.count} ${summary.count === 1 ? "trade" : "trades"} · ${summary.win}W · ${summary.loss}L · ${summary.breakeven}B/E`}
        />
        <StatCard
          label="Today"
          value={formatTradePnl({ trades: todayTrades, defaultCurrency: currency })}
          meta={`${todayTrades.length} ${todayTrades.length === 1 ? "trade" : "trades"}`}
        />
      </div>

      <section className="calendar-shell" aria-label={`${view} trading calendar`}>
        <div className="calendar-toolbar">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAnchor(shiftAnchor({ anchor, view, amount: -1 }))}
              aria-label={`Previous ${view}`}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAnchor(shiftAnchor({ anchor, view, amount: 1 }))}
              aria-label={`Next ${view}`}
            >
              <ChevronRight />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Today
            </Button>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{periodLabel({ anchor, view })}</h2>
          <Tabs value={view} onValueChange={(value) => setView(value as "week" | "month")}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="grid grid-cols-7 border-y border-border bg-[var(--surface-2)]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className={cn("calendar-grid", view === "week" && "calendar-grid-week")}>
          {days.map((day) => {
            const dayTrades = tradesForDay({ trades, day })
            const daySummary = aggregateTrades(dayTrades)
            const outside = view === "month" && !isSameMonth(day, anchor)
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  "calendar-day",
                  outside && "calendar-day-outside",
                  isSameDay(day, new Date()) && "calendar-day-today",
                )}
                aria-label={`${format(day, "EEEE d MMMM")}, ${dayTrades.length} trades, ${formatTradePnl({ trades: dayTrades, defaultCurrency: currency })}`}
              >
                <span className="calendar-date">{format(day, "d")}</span>
                {dayTrades.length > 0 ? (
                  <>
                    <span
                      className={cn(
                        "calendar-pnl",
                        new Set(dayTrades.map((t) => t.currency)).size <= 1 &&
                          (daySummary.pnl > 0
                            ? "text-[var(--success)]"
                            : daySummary.pnl < 0
                              ? "text-[var(--loss)]"
                              : ""),
                      )}
                    >
                      {formatTradePnl({ trades: dayTrades, defaultCurrency: currency })}
                    </span>
                    <span className="calendar-count">
                      {dayTrades.length} {dayTrades.length === 1 ? "trade" : "trades"}
                    </span>
                    {view === "week" && <span className="calendar-r">{formatR(daySummary.r)}</span>}
                  </>
                ) : (
                  <span className="calendar-empty">No trades</span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div>
            <h2 className="font-semibold">Recent trades</h2>
            <p className="text-sm text-muted-foreground">Your latest decisions and outcomes.</p>
          </div>
        </div>
        <div>
          {trades
            .slice()
            .sort((a, b) => b.tradedAt.localeCompare(a.tradedAt))
            .slice(0, 4)
            .map((trade) => (
              <TradeRow key={trade.id} trade={trade} onClick={() => onSelectTrade(trade)} />
            ))}
        </div>
      </section>
    </div>
  )
}
