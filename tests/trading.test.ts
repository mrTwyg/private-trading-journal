import { afterEach, describe, expect, it, vi } from "vitest"
import { format, startOfWeek } from "date-fns"

import {
  aggregateTrades,
  calculateRMultiple,
  calendarDays,
  defaultTradeDateTime,
  signedPnl,
} from "../lib/trading"
import type { Trade } from "../lib/types"

afterEach(() => vi.useRealTimers())

describe("trade result calculations", () => {
  it("turns the manually selected outcome into a signed P&L", () => {
    expect(signedPnl("win", 250)).toBe(250)
    expect(signedPnl("loss", 250)).toBe(-250)
    expect(signedPnl("breakeven", 250)).toBe(0)
  })

  it("calculates risk-normalized return and rejects invalid risk", () => {
    expect(calculateRMultiple(300, 150)).toBe(2)
    expect(calculateRMultiple(-75, 150)).toBe(-0.5)
    expect(calculateRMultiple(100, 0)).toBe(0)
  })

  it("aggregates monetary and outcome totals", () => {
    const base = {
      id: "1",
      accountId: "default-account",
      accountName: "Default Account",
      accountColor: "cyan",
      tradedAt: "2026-09-18T10:00:00.000Z",
      symbol: "NQ1!",
      direction: "long",
      setupId: null,
      setupName: null,
      setupDescription: "",
      riskAmount: 100,
      currency: "GBP",
      noteHtml: "",
      tags: [],
      image: null,
      createdAt: "2026-09-18T10:00:00.000Z",
      updatedAt: "2026-09-18T10:00:00.000Z",
      source: "manual",
      sourceImportId: null,
    } satisfies Partial<Trade>
    const trades = [
      { ...base, id: "1", outcome: "win", pnlAmount: 200, rMultiple: 2 },
      { ...base, id: "2", outcome: "loss", pnlAmount: -100, rMultiple: -1 },
      { ...base, id: "3", outcome: "breakeven", pnlAmount: 0, rMultiple: 0 },
    ] as Trade[]
    expect(aggregateTrades(trades)).toEqual({ pnl: 100, r: 1, count: 3, win: 1, loss: 1, breakeven: 1 })
  })
})

describe("calendar ranges", () => {
  it("uses a selected calendar day with the current local time for a new trade", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 21, 14, 35))
    expect(defaultTradeDateTime(undefined, new Date(2026, 9, 5))).toBe("2026-10-05T14:35")
  })

  it("returns seven Monday-first days for a week", () => {
    const anchor = new Date("2026-09-18T12:00:00")
    const days = calendarDays(anchor, "week")
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual(startOfWeek(anchor, { weekStartsOn: 1 }))
    expect(format(days[6], "yyyy-MM-dd")).toBe("2026-09-20")
  })

  it("includes complete weeks around a month and handles year boundaries", () => {
    const days = calendarDays(new Date("2026-12-15T12:00:00"), "month")
    expect(days.length % 7).toBe(0)
    expect(days[0].getDay()).toBe(1)
    expect(days.at(-1)?.getDay()).toBe(0)
    expect(days.some((day) => day.getFullYear() === 2027)).toBe(true)
  })
})
