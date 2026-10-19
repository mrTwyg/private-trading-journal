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

const require = createRequire(import.meta.url)
type Store = {
  bootstrap(): JournalBootstrap
  saveTrade(input: DesktopSaveTradeInput): Trade
  deleteTrade(id: string): void
  saveAccountTracker(id: string, input: AccountTrackerInput): JournalBootstrap
  passAccount(id: string, balance: number): JournalBootstrap
  adjustAccount(id: string, amount: number, reason: string): JournalBootstrap
  addAccount(name: string, color: string): { id: string }
  duplicateTrade(id: string): Trade
  processCodexImport(input: Record<string, unknown>): { status: string; draftId?: string }
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
const trade = (
  accountId: string,
  tradedAt = "2026-10-19T12:00:00.000Z",
): DesktopSaveTradeInput => ({
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
  it("backs up and migrates a v4 journal without changing any saved rows", async () => {
    const { file, store } = await open()
    const account = store.bootstrap().accounts[0]
    store.saveTrade({
      ...trade(account.id, "2026-10-01T12:00:00.000Z"),
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
    store.saveTrade(trade(id, "2026-10-01T12:00:00.000Z"))
    store.saveAccountTracker(id, tracking)
    const saved = store.saveTrade(trade(id))
    expect(saved.currency).toBe("USD")
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50250)
    store.saveTrade({
      ...trade(id),
      id: saved.id,
      payload: { ...trade(id).payload, pnlAmount: 400 },
    })
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50400)
    const second = store.addAccount("Second evaluation", "violet")
    store.saveAccountTracker(second.id, tracking)
    store.saveTrade({
      ...trade(second.id),
      id: saved.id,
      payload: { ...trade(second.id).payload, pnlAmount: 400 },
    })
    expect(store.bootstrap().accountTrackers.find((t) => t.accountId === id)?.balance).toBe(50000)
    expect(store.bootstrap().accountTrackers.find((t) => t.accountId === second.id)?.balance).toBe(
      50400,
    )
    store.saveTrade({
      ...trade(id),
      id: saved.id,
      payload: { ...trade(id).payload, pnlAmount: 400 },
    })
    const duplicate = store.duplicateTrade(saved.id)
    expect(store.bootstrap().accountTrackers.find((t) => t.accountId === id)?.balance).toBe(50800)
    store.deleteTrade(duplicate.id)
    store.adjustAccount(id, -200, "Payout")
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50200)
    store.deleteTrade(saved.id)
    expect(store.bootstrap().accountTrackers[0].balance).toBe(49800)
    expect(store.bootstrap().trades).toHaveLength(1)
    expect(() =>
      store.saveAccountTracker(id, { ...tracking, startsAt: "2026-01-01T00:00:00.000Z" }),
    ).toThrow("non-USD")
    store.close()
  })

  it("passes once to a linked fresh Live account without copying trades or purchase costs", async () => {
    const { store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveAccountTracker(id, tracking)
    const saved = store.saveTrade(trade(id))
    expect(() => store.saveAccountTracker(id, { ...tracking, status: "live" })).toThrow(
      "Move to Live",
    )
    const data = store.passAccount(id, 50000)
    expect(data.accountTrackers.find((t) => t.accountId === id)?.status).toBe("passed")
    const live = data.accountTrackers.find((t) => t.evaluationId === id)!
    expect(live).toMatchObject({ status: "live", balance: 50000, purchasePrice: 0 })
    expect(data.trades.map((t) => t.id)).toEqual([saved.id])
    expect(data.accountTrackers.reduce((sum, t) => sum + t.purchasePrice, 0)).toBe(49)
    expect(() => store.passAccount(id, 50000)).toThrow("Only an evaluation")
    expect(() => store.saveTrade(trade(id))).toThrow("evaluation or live")
    const restored = store.importDatabase(store.exportDatabase())
    expect(restored.accountTrackers).toEqual(data.accountTrackers)
    store.close()
  })

  it("marks an account blown only with a successfully saved trade", async () => {
    const { store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveAccountTracker(id, tracking)
    const input = {
      payload: {
        ...trade(id).payload,
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
    store.saveAccountTracker(id, tracking)
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
    expect(store.processCodexImport(payload).status).toBe("draft")
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50000)
    expect(
      store.processCodexImport({ ...payload, importId: "tracker-import-explicit", accountId: id })
        .status,
    ).toBe("saved")
    expect(store.bootstrap().accountTrackers[0].balance).toBe(50250)
    store.close()
  })
})
