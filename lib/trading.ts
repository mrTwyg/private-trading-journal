import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"

import type { Trade, TradeOutcome } from "@/lib/types"

export function signedPnl(outcome: TradeOutcome, resultAmount: number) {
  const amount = Math.abs(Number(resultAmount) || 0)
  if (outcome === "win") return amount
  if (outcome === "loss") return -amount
  return 0
}

export function calculateRMultiple(pnlAmount: number, riskAmount: number) {
  if (!Number.isFinite(riskAmount) || riskAmount <= 0) return 0
  return Number((pnlAmount / riskAmount).toFixed(4))
}

export function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatR(value: number) {
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${value.toFixed(2)}R`
}

export function aggregateTrades(trades: Trade[]) {
  return trades.reduce(
    (summary, trade) => {
      summary.pnl += trade.pnlAmount
      summary.r += trade.rMultiple
      summary.count += 1
      summary[trade.outcome] += 1
      return summary
    },
    { pnl: 0, r: 0, count: 0, win: 0, loss: 0, breakeven: 0 },
  )
}

export function calendarDays(anchor: Date, view: "week" | "month") {
  const start =
    view === "week"
      ? startOfWeek(anchor, { weekStartsOn: 1 })
      : startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
  const end =
    view === "week"
      ? endOfWeek(anchor, { weekStartsOn: 1 })
      : endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })

  const days: Date[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return days
}

export function tradesForDay(trades: Trade[], day: Date) {
  return trades.filter((trade) => isSameDay(parseISO(trade.tradedAt), day))
}

export function shiftAnchor(anchor: Date, view: "week" | "month", amount: number) {
  return view === "week" ? addDays(anchor, amount * 7) : addMonths(anchor, amount)
}

export function periodLabel(anchor: Date, view: "week" | "month") {
  if (view === "month") return format(anchor, "MMMM yyyy")
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  const end = endOfWeek(anchor, { weekStartsOn: 1 })
  return isSameMonth(start, end)
    ? `${format(start, "d")}–${format(end, "d MMMM yyyy")}`
    : `${format(start, "d MMM")}–${format(end, "d MMM yyyy")}`
}

export function calendarKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}
