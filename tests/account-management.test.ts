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
  TradingAccount,
  Firm,
} from "../lib/types"

const require = createRequire(import.meta.url)
type Store = {
  bootstrap(): JournalBootstrap
  createTrackedAccount(name: string, color: string, input: AccountTrackerInput): JournalBootstrap
  deleteAccount(id: string, confirmationName: string): JournalBootstrap
  addAccount(name: string, color: string): TradingAccount
  addFirm(name: string): Firm
  deleteFirm(id: string): void
  saveAccountTracker(id: string, input: AccountTrackerInput): JournalBootstrap
  passAccount(id: string, balance: number): JournalBootstrap
  adjustAccount(id: string, amount: number, reason: string): JournalBootstrap
  saveTrade(input: DesktopSaveTradeInput): Trade
  processCodexImport(input: Record<string, unknown>): { status: string }
  exportDatabase(): Uint8Array
  close(): void
}
const { createJournalStore } = require("../electron/database.cjs") as {
  createJournalStore(file: string): Promise<Store>
}
const initSql = require("sql.js")
const directories: string[] = []
afterEach(() => {
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true })
})
async function open() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "account-management-"))
  directories.push(directory)
  const file = path.join(directory, "journal.sqlite")
  return { file, store: await createJournalStore(file) }
}
const tracking: AccountTrackerInput = {
  firm: "Custom Firm",
  status: "evaluation",
  accountSize: 50000,
  openingBalance: 50000,
  startsAt: "2026-10-19T00:00:00.000Z",
  purchasePrice: 49,
  purchaseDate: "2026-10-18",
  discountCode: "SALE",
}
const trade = (accountId: string, tagIds: string[] = []): DesktopSaveTradeInput => ({
  payload: {
    accountId,
    tradedAt: "2026-10-19T12:00:00.000Z",
    symbol: "MNQ",
    direction: "long",
    setupId: null,
    riskAmount: 100,
    outcome: "win",
    pnlAmount: 250,
    tagIds,
    noteHtml: "<p>Keep this note</p>",
  },
  image: {
    fileName: "chart.png",
    contentType: "image/png",
    bytes: new Uint8Array([137, 80, 78, 71]),
  },
})

describe("account management", () => {
  it("creates the account and tracker together or saves neither", async () => {
    const { file, store } = await open()
    const before = store.bootstrap()
    const original = fs.readFileSync(file)
    expect(() =>
      store.createTrackedAccount("Invalid", "cyan", { ...tracking, purchasePrice: -1 }),
    ).toThrow("USD")
    expect(store.bootstrap()).toEqual(before)
    expect(fs.readFileSync(file)).toEqual(original)
    const data = store.createTrackedAccount("New evaluation", "violet", tracking)
    const account = data.accounts.find((a) => a.name === "New evaluation")!
    expect(data.accountTrackers.find((t) => t.accountId === account.id)).toMatchObject({
      firm: "Custom Firm",
      balance: 50000,
    })
    store.close()
    const reopened = await createJournalStore(file)
    expect(reopened.bootstrap()).toEqual(data)
    reopened.close()
  })

  it("deletes only the confirmed account and dependent data while preserving its live counterpart", async () => {
    const { store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveAccountTracker(id, tracking)
    const tag = store.bootstrap().tags[0]
    store.saveTrade(trade(id, [tag.id]))
    const imported = {
      schemaVersion: 1,
      source: "codex",
      accountId: id,
      tradedAt: "2026-10-19T12:00:00Z",
      symbol: "MNQ",
      direction: "long",
      riskAmount: 100,
      outcome: "win",
      resultAmount: 250,
    }
    expect(store.processCodexImport({ ...imported, importId: "delete-account-saved" }).status).toBe(
      "saved",
    )
    expect(
      store.processCodexImport({ ...imported, importId: "delete-account-draft", riskAmount: null })
        .status,
    ).toBe("draft")
    expect(
      store.processCodexImport({
        ...imported,
        accountId: null,
        importId: "unassigned-draft",
        riskAmount: null,
      }).status,
    ).toBe("draft")
    store.adjustAccount(id, -100, "Payout")
    const data = store.passAccount(id, 50000)
    const live = data.accounts.find((a) => a.id !== id)!
    const liveTrade = trade(live.id, [tag.id])
    liveTrade.payload.tradedAt = new Date(Date.now() + 1000).toISOString()
    const preserved = store.saveTrade(liveTrade)
    expect(() => store.deleteAccount(id, "wrong name")).toThrow("exact account name")
    expect(store.bootstrap().trades).toHaveLength(3)
    const after = store.deleteAccount(id, "Default Account")
    expect(after.accounts).toEqual([live])
    expect(after.trades).toEqual([preserved])
    expect(after.accountTrackers).toHaveLength(1)
    expect(after.accountTrackers[0]).toMatchObject({
      accountId: live.id,
      evaluationId: null,
      purchasePrice: 0,
      balance: 50250,
    })
    const SQL = await initSql()
    const db = new SQL.Database(store.exportDatabase())
    for (const table of ["trade_images", "trade_tags"])
      expect(db.exec(`SELECT COUNT(*) FROM ${table}`)[0].values[0][0]).toBe(1)
    expect(db.exec("SELECT COUNT(*) FROM account_adjustments")[0].values[0][0]).toBe(0)
    expect(db.exec("PRAGMA foreign_key_check")).toEqual([])
    expect(
      db.exec(
        "SELECT status, trade_id FROM import_receipts WHERE import_id = 'delete-account-saved'",
      )[0].values,
    ).toEqual([["undone", null]])
    const draftPayload = JSON.parse(
      String(
        db.exec("SELECT payload_json FROM trade_drafts WHERE import_id = 'delete-account-draft'")[0]
          .values[0][0],
      ),
    )
    expect(draftPayload.accountId).toBeUndefined()
    expect(draftPayload.symbol).toBe("MNQ")
    expect(after.drafts).toHaveLength(2)
    expect(
      after.drafts.find((d) => d.importId === "delete-account-draft")?.missingFields,
    ).toContain("accountId")
    db.close()
    store.close()
  })

  it("preserves the evaluation when deleting live and keeps the final deletion empty after reopening", async () => {
    const { file, store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveAccountTracker(id, tracking)
    const data = store.passAccount(id, 50000)
    const live = data.accounts.find((a) => a.id !== id)!
    const after = store.deleteAccount(live.id, live.name)
    expect(after.accountTrackers[0]).toMatchObject({
      accountId: id,
      status: "passed",
      purchasePrice: 49,
    })
    store.deleteAccount(id, "Default Account")
    store.close()
    const reopened = await createJournalStore(file)
    expect(reopened.bootstrap().accounts).toEqual([])
    expect(reopened.bootstrap().accountTrackers).toEqual([])
    reopened.close()
  })

  it("backs up untouched v5 data, seeds firms once and retains historical firm names", async () => {
    const { file, store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveAccountTracker(id, tracking)
    store.saveTrade(trade(id))
    const before = store.bootstrap()
    const bytes = store.exportDatabase()
    store.close()
    const SQL = await initSql()
    const legacy = new SQL.Database(bytes)
    legacy.run("DROP TABLE firms; PRAGMA user_version = 5")
    const original = Buffer.from(legacy.export())
    fs.writeFileSync(file, original)
    legacy.close()
    const upgraded = await createJournalStore(file)
    const after = upgraded.bootstrap()
    for (const key of [
      "accounts",
      "accountTrackers",
      "trades",
      "profile",
      "setups",
      "tags",
      "drafts",
    ] as const)
      expect(after[key]).toEqual(before[key])
    expect(after.firms.map((f) => f.name)).toEqual([
      "Alpha Futures",
      "Apex",
      "Custom Firm",
      "FundedNext Futures",
      "Topstep",
      "Tradeify",
    ])
    expect(fs.readFileSync(`${file}.before-account-management-v6.bak`)).toEqual(original)
    const custom = after.firms.find((f) => f.name === "Custom Firm")!
    upgraded.deleteFirm(custom.id)
    const added = upgraded.addFirm("Another Firm")
    expect(() => upgraded.addFirm("another firm")).toThrow("already exists")
    upgraded.close()
    const reopened = await createJournalStore(file)
    expect(reopened.bootstrap().firms).toContainEqual(added)
    expect(reopened.bootstrap().firms.some((f) => f.name === "Custom Firm")).toBe(false)
    expect(reopened.bootstrap().accountTrackers[0].firm).toBe("Custom Firm")
    expect(fs.readFileSync(`${file}.before-account-management-v6.bak`)).toEqual(original)
    reopened.close()
  })
})
