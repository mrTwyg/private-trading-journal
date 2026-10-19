// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { I18nProvider } from "react-aria-components/I18nProvider"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { DateTimeField } from "@/components/ui/date-time-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AccountsView } from "@/components/accounts-view"
import type { JournalBootstrap, JournalDesktopApi } from "@/lib/types"

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  vi.stubGlobal("CSS", {
    escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`),
  })
  window.matchMedia ||= (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as typeof window.matchMedia
  Element.prototype.scrollIntoView ||= () => undefined
})
afterEach(cleanup)

describe("React Aria journal controls", () => {
  it("shows the tracked balance and confirms a fresh live account before passing", async () => {
    const accounts = [
      { id: "evaluation-id", name: "Evaluation one", color: "cyan", archived: false },
    ]
    const trackers: JournalBootstrap["accountTrackers"] = [
      {
        accountId: "evaluation-id",
        firm: "Example",
        status: "evaluation",
        accountSize: 50000,
        openingBalance: 50000,
        startsAt: "2026-10-19T00:00:00Z",
        purchasePrice: 49,
        purchaseDate: "2026-10-19",
        discountCode: "SALE",
        evaluationId: null,
        balance: 50250,
        adjustments: [],
      },
    ]
    const passAccount = vi.fn().mockResolvedValue({ accounts, accountTrackers: trackers })
    const onReload = vi.fn()
    render(
      <AccountsView
        accounts={accounts}
        trackers={trackers}
        api={{ passAccount } as unknown as JournalDesktopApi}
        onReload={onReload}
      />,
    )
    expect(screen.getByText("US$50,250.00")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Move to Live" }))
    expect(passAccount).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText("Live starting balance (USD)"), {
      target: { value: "51000" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }))
    await waitFor(() => expect(passAccount).toHaveBeenCalledWith("evaluation-id", 51000))
    await waitFor(() => expect(onReload).toHaveBeenCalled())
  })
  it("opens the keyboard-ready instrument list", () => {
    render(
      <Select aria-label="Instrument" value="NQ" onValueChange={() => undefined}>
        <SelectTrigger>
          <SelectValue placeholder="Choose an instrument" />
        </SelectTrigger>
        <SelectContent>
          {["NQ", "ES", "MNQ", "MES"].map((symbol) => (
            <SelectItem key={symbol} value={symbol}>
              {symbol}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    )
    fireEvent.click(screen.getByRole("button"))
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(
      expect.arrayContaining(["NQ", "ES", "MNQ", "MES"]),
    )
  })

  it("shows a styled option's label instead of its stored id", () => {
    render(
      <Select
        aria-label="Trading account"
        value="a1193f42-d896-45b7"
        onValueChange={() => undefined}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a1193f42-d896-45b7" textValue="live">
            <span>
              <i />
              live
            </span>
          </SelectItem>
        </SelectContent>
      </Select>,
    )
    const trigger = screen.getByRole("button", { name: /Trading account/ })
    expect(trigger.textContent).toContain("live")
    expect(trigger.textContent).not.toContain("a1193f42")
  })

  it("opens a locale-aware calendar and keeps time separate", () => {
    render(
      <I18nProvider locale="en-GB">
        <DateTimeField value="2026-09-19T09:30" onChange={() => undefined} />
      </I18nProvider>,
    )
    expect(screen.getByLabelText("Trade time")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Open calendar/ }))
    expect(screen.getByRole("grid")).toBeTruthy()
  })
})
