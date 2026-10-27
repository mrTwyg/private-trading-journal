import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { afterEach, describe, expect, it } from "vitest"
import type {
  AccountTrackerInput,
  DesktopSaveTradeInput,
  JournalBootstrap,
  Trade,
} from "../lib/types"

import { aggregateTrades } from "../lib/trading"

const require = createRequire(import.meta.url)
type Store = {
  bootstrap(): JournalBootstrap
  saveTrade(input: DesktopSaveTradeInput): Trade
  deleteTrade(id: string): void
  saveAccountTracker(input: { id: string; tracker: AccountTrackerInput }): JournalBootstrap
  passAccount(input: { id: string; openingBalance: number }): JournalBootstrap
  adjustAccount(input: { id: string; amount: number; reason: string }): JournalBootstrap
  addAccount(input: { name: string; color: string }): { id: string }
  duplicateTrade(id: string): Trade
  processCodexImport(input: { payload: Record<string, unknown> }): {
    status: string
    draftId?: string
  }
  importDatabase(bytes: Uint8Array): JournalBootstrap
  exportDatabase(): Uint8Array
  close(): void
}
const { createJournalStore } = require("../electron/database.cjs") as {
  createJournalStore(path: string): Promise<Store>
}
const initSql = require("sql.js")
const directories: string[] = []
afterEach(() => {
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true })
})
async function open() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tracker-test-"))
  directories.push(directory)
  const file = path.join(directory, "journal.sqlite")
  return { file, store: await createJournalStore(file) }
}
const tracking: AccountTrackerInput = {
  firm: "Example Firm",
  status: "evaluation",
  accountSize: 50000,
  openingBalance: 50000,
  startsAt: "2026-10-19T00:00:00.000Z",
  purchasePrice: 49,
  purchaseDate: "2026-10-18",
  discountCode: "SALE",
}
const trade = ({
  accountId,
  tradedAt = "2026-10-19T12:00:00.000Z",
}: {
  accountId: string
  tradedAt?: string
}): DesktopSaveTradeInput => ({
  payload: {
    accountId,
    tradedAt,
    symbol: "MNQ",
    direction: "long",
    setupId: null,
    riskAmount: 100,
    outcome: "win",
    pnlAmount: 250,
    tagIds: [],
    noteHtml: "<p>Keep this note</p>",
  },
})

describe("account tracking", () => {
  it("reconciles two months of trading with the opening balance and adjustments after reopening", async () => {
    const { file, store } = await open()
    const id = store.bootstrap().accounts[0].id
    const other = store.addAccount({ name: "Other account", color: "violet" })
    store.saveAccountTracker({
      id,
      tracker: { ...tracking, startsAt: "2026-09-01T00:00:00.000Z" },
    })
    for (const [tradedAt, pnlAmount] of [
      ["2026-09-30T12:00:00.000Z", 955],
      ["2026-10-15T12:00:00.000Z", -435],
    ] as const) {
      const input = trade({ accountId: id, tradedAt })
      store.saveTrade({
        ...input,
        payload: {
          ...input.payload,
          pnlAmount,
          riskAmount: Math.abs(pnlAmount),
          outcome: pnlAmount < 0 ? "loss" : "win",
        },
      })
    }
    store.saveTrade(trade({ accountId: other.id }))
    const data = store.bootstrap()
    const pnl = aggregateTrades(data.trades.filter((t) => t.accountId === id)).pnl
    expect(pnl).toBe(520)
    expect(data.accountTrackers[0].balance).toBe(50000 + pnl)
    store.adjustAccount({ id, amount: -100, reason: "Payout" })
    store.close()
    const reopened = await createJournalStore(file)
    try {
      expect(reopened.bootstrap().accountTrackers[0].balance).toBe(50000 + pnl - 100)
    } finally {
      reopened.close()
    }
  })

  it("backs up and migrates a v4 journal without changing any saved rows", async () => {
    const { file, store } = await open()
    const account = store.bootstrap().accounts[0]
    store.saveTrade({
      ...trade({ accountId: account.id, tradedAt: "2026-10-01T12:00:00.000Z" }),
      image: {
        fileName: "chart.png",
        contentType: "image/png",
        bytes: new Uint8Array([137, 80, 78, 71]),
      },
    })
    const before = store.bootstrap()
    const bytes = store.exportDatabase()
    store.close()
    const SQL = await initSql()
    const legacy = new SQL.Database(bytes)
    legacy.run(
      "DROP TABLE account_adjustments; DROP TABLE account_tracking; PRAGMA user_version = 4",
    )
    const original = Buffer.from(legacy.export())
    fs.writeFileSync(file, original)
    legacy.close()
    const upgraded = await createJournalStore(file)
    const after = upgraded.bootstrap()
    for (const key of ["trades", "accounts", "profile", "setups", "tags", "drafts"] as const)
      expect(after[key]).toEqual(before[key])
    expect(after.accountTrackers).toEqual([])
    expect(fs.readFileSync(`${file}.before-account-tracker-v5.bak`)).toEqual(original)
    upgraded.close()
    const reopened = await createJournalStore(file)
    reopened.close()
    expect(fs.readFileSync(`${file}.before-account-tracker-v5.bak`)).toEqual(original)
  })

  it("calculates USD balances from the start, including edits, moves, deletes and adjustments", async () => {
    const { store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveTrade(trade({ accountId: id, tradedAt: "2026-10-01T12:00:00.000Z" }))
    store.saveAccountTracker({ id, tracker: tracking })
    const saved = store.saveTrade(trade({ accountId: id }))
    expect(saved.currency).toBe("USD")
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50250)
    store.saveTrade({
      ...trade({ accountId: id }),
      id: saved.id,
      payload: { ...trade({ accountId: id }).payload, pnlAmount: 400 },
    })
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50400)
    const second = store.addAccount({ name: "Second evaluation", color: "violet" })
    store.saveAccountTracker({ id: second.id, tracker: tracking })
    store.saveTrade({
      ...trade({ accountId: second.id }),
      id: saved.id,
      payload: { ...trade({ accountId: second.id }).payload, pnlAmount: 400 },
    })
    expect(store.bootstrap().accountTrackers.find((t) => t.accountId === id)?.balance).toBe(50000)
    expect(store.bootstrap().accountTrackers.find((t) => t.accountId === second.id)?.balance).toBe(
      50400,
    )
    store.saveTrade({
      ...trade({ accountId: id }),
      id: saved.id,
      payload: { ...trade({ accountId: id }).payload, pnlAmount: 400 },
    })
    const duplicate = store.duplicateTrade(saved.id)
    expect(store.bootstrap().accountTrackers.find((t) => t.accountId === id)?.balance).toBe(50800)
    store.deleteTrade(duplicate.id)
    store.adjustAccount({ id, amount: -200, reason: "Payout" })
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50200)
    store.deleteTrade(saved.id)
    expect(store.bootstrap().accountTrackers[0].balance).toBe(49800)
    expect(store.bootstrap().trades).toHaveLength(1)
    expect(() =>
      store.saveAccountTracker({
        id,
        tracker: { ...tracking, startsAt: "2026-01-01T00:00:00.000Z" },
      }),
    ).toThrow("non-USD")
    store.close()
  })

  it("passes once to a linked fresh Live account without copying trades or purchase costs", async () => {
    const { store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveAccountTracker({ id, tracker: tracking })
    const saved = store.saveTrade(trade({ accountId: id }))
    expect(() =>
      store.saveAccountTracker({ id, tracker: { ...tracking, status: "live" } }),
    ).toThrow("Move to Live")
    const data = store.passAccount({ id, openingBalance: 50000 })
    expect(data.accountTrackers.find((t) => t.accountId === id)?.status).toBe("passed")
    const live = data.accountTrackers.find((t) => t.evaluationId === id)!
    expect(live).toMatchObject({ status: "live", balance: 50000, purchasePrice: 0 })
    expect(data.trades.map((t) => t.id)).toEqual([saved.id])
    expect(data.accountTrackers.reduce((sum, t) => sum + t.purchasePrice, 0)).toBe(49)
    expect(() => store.passAccount({ id, openingBalance: 50000 })).toThrow("Only an evaluation")
    expect(() => store.saveTrade(trade({ accountId: id }))).toThrow("evaluation or live")
    const restored = store.importDatabase(store.exportDatabase())
    expect(restored.accountTrackers).toEqual(data.accountTrackers)
    store.close()
  })

  it("marks an account blown only with a successfully saved trade", async () => {
    const { store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveAccountTracker({ id, tracker: tracking })
    const input = {
      payload: {
        ...trade({ accountId: id }).payload,
        markAccountBlown: true,
        outcome: "loss" as const,
        pnlAmount: -100,
      },
    }
    expect(() =>
      store.saveTrade({
        ...input,
        image: { fileName: "bad", contentType: "text/plain", bytes: new Uint8Array([1]) },
      }),
    ).toThrow("JPEG")
    expect(store.bootstrap().accountTrackers[0].status).toBe("evaluation")
    const saved = store.saveTrade(input)
    expect(store.bootstrap().accountTrackers[0]).toMatchObject({ status: "blown", balance: 49900 })
    store.deleteTrade(saved.id)
    expect(store.bootstrap().accountTrackers[0]).toMatchObject({ status: "blown", balance: 50000 })
    store.close()
  })

  it("holds ambiguous Codex accounts for review instead of guessing the balance to update", async () => {
    const { store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveAccountTracker({ id, tracker: tracking })
    const payload = {
      schemaVersion: 1,
      source: "codex",
      importId: "tracker-import",
      tradedAt: "2026-10-19T12:00:00Z",
      symbol: "MNQ",
      direction: "long",
      riskAmount: 100,
      outcome: "win",
      resultAmount: 250,
    }
    expect(store.processCodexImport({ payload }).status).toBe("draft")
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50000)
    expect(
      store.processCodexImport({
        payload: { ...payload, importId: "tracker-import-explicit", accountId: id },
      }).status,
    ).toBe("saved")
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50250)
    store.close()
  })
})
