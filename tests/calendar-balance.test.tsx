// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { CalendarView } from "@/components/journal/calendar-view"
import type { Trade } from "@/lib/types"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const trade = (id: string, tradedAt: string, pnlAmount: number): Trade => ({
  id,
  tradedAt,
  pnlAmount,
  accountId: "account",
  accountName: "Test account",
  accountColor: "cyan",
  symbol: "MNQ",
  direction: "long",
  setupId: null,
  setupName: null,
  setupDescription: "",
  riskAmount: 100,
  currency: "USD",
  outcome: pnlAmount >= 0 ? "win" : "loss",
  rMultiple: pnlAmount / 100,
  noteHtml: "",
  tags: [],
  image: null,
  createdAt: tradedAt,
  updatedAt: tradedAt,
  source: "manual",
  sourceImportId: null,
})

const show = (trades: Trade[]) =>
  render(
    <CalendarView
      trades={trades}
      accounts={[]}
      selectedAccountId="all"
      onAccountChange={() => {}}
      currency="USD"
      onSelectDay={() => {}}
      onSelectTrade={() => {}}
    />,
  )

it("counts each trade in only its own month, even when neighbouring days appear in the grid", () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 15, 12))
  show([
    trade("september", new Date(2026, 8, 30, 12).toISOString(), 955),
    trade("october", new Date(2026, 9, 15, 12).toISOString(), -435),
    trade("november", new Date(2026, 10, 1, 0).toISOString(), 200),
  ])
  const monthly = () => screen.getByText("Monthly net P&L").closest(".metric-card")!.textContent
  expect(monthly()).toContain("-US$435.00")
  expect(monthly()).toContain("1 trade")
  // Adjacent days remain visible and selectable, but do not inflate this month's summary.
  expect(screen.getByRole("button", { name: /Wednesday 30 September, 1 trades/ })).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }))
  expect(monthly()).toContain("US$955.00")
  expect(monthly()).toContain("1 trade")
  fireEvent.click(screen.getByRole("button", { name: "Next month" }))
  fireEvent.click(screen.getByRole("button", { name: "Next month" }))
  expect(monthly()).toContain("US$200.00")
  expect(monthly()).toContain("1 trade")
})

it("excludes next Monday at midnight from the weekly summary", () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 15, 12))
  show([
    trade("sunday", new Date(2026, 9, 18, 23, 59, 59).toISOString(), 100),
    trade("monday", new Date(2026, 9, 19, 0).toISOString(), 200),
  ])
  fireEvent.click(screen.getByRole("tab", { name: "Week" }))
  const weekly = screen.getByText("Weekly net P&L").closest(".metric-card")!.textContent
  expect(weekly).toContain("US$100.00")
  expect(weekly).toContain("1 trade")
})
