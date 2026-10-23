// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { I18nProvider } from "react-aria-components/I18nProvider"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { TradeFormDialog } from "@/components/journal/trade-form-dialog"
import type { Profile, Trade } from "@/lib/types"
import { DateTimeField } from "@/components/ui/date-time-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AccountsView } from "@/components/accounts-view"
import { DeleteAccountDialog } from "@/components/journal/delete-account-dialog"
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
  it("opens the complete account form before creating anything", () => {
    const createTrackedAccount = vi.fn()
    render(
      <AccountsView
        accounts={[]}
        trackers={[]}
        firms={[]}
        api={{ createTrackedAccount } as unknown as JournalDesktopApi}
        onReload={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Add account" }))
    expect(screen.getByLabelText("Account name")).toHaveValue("")
    expect(screen.getByLabelText("Opening balance (USD)")).toHaveValue(50000)
    expect(screen.getAllByText("$", { exact: true })).toHaveLength(3)
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(createTrackedAccount).not.toHaveBeenCalled()
  })

  it("creates the named account and tracking details together", async () => {
    const bootstrap = { accounts: [], accountTrackers: [], firms: [] }
    const createTrackedAccount = vi.fn().mockResolvedValue(bootstrap)
    const onReload = vi.fn()
    render(
      <AccountsView
        accounts={[]}
        trackers={[]}
        firms={[{ id: "topstep", name: "Topstep" }]}
        api={{ createTrackedAccount } as unknown as JournalDesktopApi}
        onReload={onReload}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Add account" }))
    fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "My evaluation" } })
    fireEvent.click(screen.getByRole("button", { name: /Prop firm/ }))
    fireEvent.click(screen.getByRole("option", { name: "Topstep" }))
    fireEvent.click(screen.getByRole("button", { name: "Create account" }))
    await waitFor(() =>
      expect(createTrackedAccount).toHaveBeenCalledWith({
        name: "My evaluation",
        color: "cyan",
        tracker: expect.objectContaining({
          firm: "Topstep",
          openingBalance: 50000,
          purchasePrice: 0,
        }),
      }),
    )
    expect(onReload).toHaveBeenCalledWith(bootstrap)
  })

  it("requires the exact name for deletion and keeps failures open for retry", async () => {
    const account = { id: "account", name: "Keep safe", color: "cyan", archived: false }
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error("Storage unavailable"))
      .mockResolvedValueOnce(undefined)
    const onClose = vi.fn()
    render(<DeleteAccountDialog account={account} onConfirm={onConfirm} onClose={onClose} />)
    const button = screen.getByRole("button", { name: "Delete permanently" })
    const name = screen.getByLabelText("Type the exact account name: Keep safe")
    expect(button).toBeDisabled()
    fireEvent.change(name, { target: { value: "keep safe" } })
    expect(button).toBeDisabled()
    fireEvent.change(name, { target: { value: account.name } })
    fireEvent.click(button)
    expect(await screen.findByRole("alert")).toHaveTextContent("Storage unavailable")
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(onConfirm).toHaveBeenLastCalledWith({ account, confirmationName: account.name })
  })

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
        firms={[{ id: "example", name: "Example" }]}
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
    await waitFor(() =>
      expect(passAccount).toHaveBeenCalledWith({ id: "evaluation-id", openingBalance: 51000 }),
    )
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

const copyProfile = { defaultCurrency: "USD", timezone: "Europe/London" } as Profile
const copyAccounts = [
  { id: "one", name: "First", color: "cyan", archived: false },
  { id: "two", name: "Second", color: "cyan", archived: false },
  { id: "old", name: "Archived", color: "cyan", archived: true },
]
const sourceTrade = {
  accountName: "First",
  accountColor: "cyan",
  setupName: null,
  rMultiple: 2.5,
  createdAt: "2026-10-19T12:00:00Z",
  updatedAt: "2026-10-19T12:00:00Z",
  source: "manual",
  sourceImportId: null,
  id: "source",
  accountId: "one",
  tradedAt: "2026-10-19T12:00:00Z",
  symbol: "MNQ",
  direction: "long",
  setupId: null,
  setupDescription: "Sweep",
  tags: [],
  riskAmount: 100,
  outcome: "win",
  pnlAmount: 250,
  noteHtml: "<p>Patient entry</p>",
  currency: "USD",
  image: {
    id: "image",
    tradeId: "source",
    fileName: "chart.png",
    contentType: "image/png",
    url: "data:image/png;base64,iVBORw0KGgo=",
  },
} satisfies Trade

function renderTradeForm(props: Partial<React.ComponentProps<typeof TradeFormDialog>> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onOpenChange = vi.fn()
  render(
    <I18nProvider locale="en-GB">
      <TradeFormDialog
        open
        onOpenChange={onOpenChange}
        profile={copyProfile}
        accounts={copyAccounts}
        trackers={[]}
        selectedAccountId="two"
        setups={[]}
        tags={[]}
        onSave={onSave}
        {...props}
      />
    </I18nProvider>,
  )
  return { onSave, onOpenChange }
}

describe("multi-account trade form", () => {
  it("defaults to the selected account and submits one shared trade to multiple destinations", async () => {
    const { onSave } = renderTradeForm()
    expect(screen.getByRole("checkbox", { name: "Second (USD)" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "First (USD)" })).not.toBeChecked()
    expect(screen.queryByText("Archived (USD)")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox", { name: "First (USD)" }))
    fireEvent.click(screen.getByRole("button", { name: /Instrument/ }))
    fireEvent.click(screen.getByRole("option", { name: "MNQ" }))
    fireEvent.change(screen.getByLabelText("Risked (USD)"), { target: { value: "100" } })
    fireEvent.change(screen.getByLabelText("Amount won"), { target: { value: "250" } })
    fireEvent.click(screen.getByRole("button", { name: "Save to 2 accounts" }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: expect.objectContaining({ symbol: "MNQ", riskAmount: 100, resultAmount: 250 }),
          image: null,
          removeImage: false,
          accountIds: ["two", "one"],
        }),
      ),
    )
  })

  it("prefills copies without saving and lets risk/result change before saving", async () => {
    const { onSave } = renderTradeForm({ copyTrade: sourceTrade })
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Save to 0 accounts" })).toBeDisabled()
    expect(screen.getByLabelText("Risked (USD)")).toHaveValue(100)
    expect(screen.getByAltText("Trade screenshot preview")).toHaveAttribute(
      "src",
      sourceTrade.image!.url,
    )
    fireEvent.click(screen.getByRole("checkbox", { name: "Second (USD)" }))
    fireEvent.change(screen.getByLabelText("Risked (USD)"), { target: { value: "200" } })
    fireEvent.change(screen.getByLabelText("Amount won"), { target: { value: "600" } })
    fireEvent.click(screen.getByRole("button", { name: "Save to 1 account" }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: expect.objectContaining({
            symbol: "MNQ",
            riskAmount: 200,
            resultAmount: 600,
            setupDescription: "Sweep",
            noteHtml: sourceTrade.noteHtml,
          }),
          image: null,
          removeImage: false,
          accountIds: ["two"],
        }),
      ),
    )
  })

  it("keeps edits single-account and preserves the form after a failed save", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Choose an active account."))
    const { onOpenChange } = renderTradeForm({ trade: sourceTrade, onSave })
    expect(screen.queryByText("0 accounts selected.")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Choose an active account."),
    )
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Risked (USD)")).toHaveValue(100)
  })
})
