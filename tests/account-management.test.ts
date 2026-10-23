import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { afterEach, describe, expect, it, vi } from "vitest"
import type {
  AccountTrackerInput,
  DesktopSaveTradeInput,
  DesktopSaveTradesInput,
  JournalBootstrap,
  Trade,
  TradingAccount,
  Firm,
} from "../lib/types"

const require = createRequire(import.meta.url)
type Store = {
  bootstrap(): JournalBootstrap
  createTrackedAccount(input: {
    name: string
    color: string
    tracker: AccountTrackerInput
  }): JournalBootstrap
  deleteAccount(input: { id: string; confirmationName: string }): JournalBootstrap
  addAccount(input: { name: string; color: string }): TradingAccount
  updateAccount(input: {
    id: string
    changes: Pick<TradingAccount, "name" | "color" | "archived">
  }): TradingAccount
  addFirm(name: string): Firm
  deleteFirm(id: string): void
  saveAccountTracker(input: { id: string; tracker: AccountTrackerInput }): JournalBootstrap
  passAccount(input: { id: string; openingBalance: number }): JournalBootstrap
  adjustAccount(input: { id: string; amount: number; reason: string }): JournalBootstrap
  saveTrade(input: DesktopSaveTradeInput): Trade
  saveTrades(input: DesktopSaveTradesInput): Trade[]
  deleteTrade(id: string): void
  saveProfile(profile: JournalBootstrap["profile"]): void
  processCodexImport(input: { payload: Record<string, unknown> }): { status: string }
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
const trade = ({
  accountId,
  tagIds = [],
}: {
  accountId: string
  tagIds?: string[]
}): DesktopSaveTradeInput => ({
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
      store.createTrackedAccount({
        name: "Invalid",
        color: "cyan",
        tracker: { ...tracking, purchasePrice: -1 },
      }),
    ).toThrow("USD")
    expect(store.bootstrap()).toEqual(before)
    expect(fs.readFileSync(file)).toEqual(original)
    const data = store.createTrackedAccount({
      name: "New evaluation",
      color: "violet",
      tracker: tracking,
    })
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
    store.saveAccountTracker({ id, tracker: tracking })
    const tag = store.bootstrap().tags[0]
    store.saveTrade(trade({ accountId: id, tagIds: [tag.id] }))
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
    expect(
      store.processCodexImport({ payload: { ...imported, importId: "delete-account-saved" } })
        .status,
    ).toBe("saved")
    expect(
      store.processCodexImport({
        payload: { ...imported, importId: "delete-account-draft", riskAmount: null },
      }).status,
    ).toBe("draft")
    expect(
      store.processCodexImport({
        payload: {
          ...imported,
          accountId: null,
          importId: "unassigned-draft",
          riskAmount: null,
        },
      }).status,
    ).toBe("draft")
    store.adjustAccount({ id, amount: -100, reason: "Payout" })
    const data = store.passAccount({ id, openingBalance: 50000 })
    const live = data.accounts.find((a) => a.id !== id)!
    const liveTrade = trade({ accountId: live.id, tagIds: [tag.id] })
    liveTrade.payload.tradedAt = new Date(Date.now() + 1000).toISOString()
    const preserved = store.saveTrade(liveTrade)
    expect(() => store.deleteAccount({ id, confirmationName: "wrong name" })).toThrow(
      "exact account name",
    )
    expect(store.bootstrap().trades).toHaveLength(3)
    const after = store.deleteAccount({ id, confirmationName: "Default Account" })
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
    store.saveAccountTracker({ id, tracker: tracking })
    const data = store.passAccount({ id, openingBalance: 50000 })
    const live = data.accounts.find((a) => a.id !== id)!
    const after = store.deleteAccount({ id: live.id, confirmationName: live.name })
    expect(after.accountTrackers[0]).toMatchObject({
      accountId: id,
      status: "passed",
      purchasePrice: 49,
    })
    store.deleteAccount({ id, confirmationName: "Default Account" })
    store.close()
    const reopened = await createJournalStore(file)
    expect(reopened.bootstrap().accounts).toEqual([])
    expect(reopened.bootstrap().accountTrackers).toEqual([])
    reopened.close()
  })

  it("backs up untouched v5 data, seeds firms once and retains historical firm names", async () => {
    const { file, store } = await open()
    const id = store.bootstrap().accounts[0].id
    store.saveAccountTracker({ id, tracker: tracking })
    store.saveTrade(trade({ accountId: id }))
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

describe("copy trades across accounts", () => {
  it("preserves existing history, screenshots and settings when logging a new batch", async () => {
    const { file, store } = await open()
    const source = store.saveTrade(trade({ accountId: "default-account" }))
    const accounts = Array.from({ length: 5 }, (_, i) =>
      store.addAccount({ name: `Destination ${i}`, color: "cyan" }),
    )
    const before = store.bootstrap()
    store.saveTrades({
      ...trade({ accountId: accounts[0].id }),
      accountIds: accounts.map((account) => account.id),
    })
    const after = store.bootstrap()
    expect(after.trades).toHaveLength(before.trades.length + 5)
    expect(after.trades.find((item) => item.id === source.id)).toEqual(source)
    for (const key of [
      "profile",
      "accounts",
      "accountTrackers",
      "firms",
      "setups",
      "tags",
      "drafts",
    ] as const)
      expect(after[key]).toEqual(before[key])
    store.close()
    const reopened = await createJournalStore(file)
    expect(reopened.bootstrap().trades.find((item) => item.id === source.id)).toEqual(source)
    expect(reopened.bootstrap().trades).toHaveLength(before.trades.length + 5)
    reopened.close()
  })

  it("saves five independent copies with identical facts and screenshots, and persists them", async () => {
    const { file, store } = await open()
    const accounts = Array.from({ length: 5 }, (_, i) =>
      store.addAccount({ name: `Copy ${i}`, color: "cyan" }),
    )
    const tag = store.bootstrap().tags[0]
    const input = trade({ accountId: accounts[0].id, tagIds: [tag.id] })
    const saved = store.saveTrades({
      ...input,
      accountIds: accounts.map((a) => a.id).concat(accounts[0].id),
    })
    expect(saved).toHaveLength(5)
    expect(new Set(saved.map((t) => t.id)).size).toBe(5)
    expect(new Set(saved.map((t) => t.image?.id)).size).toBe(5)
    for (const copy of saved)
      expect(copy).toMatchObject({
        tradedAt: input.payload.tradedAt,
        riskAmount: 100,
        pnlAmount: 250,
        rMultiple: 2.5,
        noteHtml: input.payload.noteHtml,
        tags: [tag],
        image: { fileName: "chart.png" },
      })
    store.deleteTrade(saved[0].id)
    expect(store.bootstrap().trades).toHaveLength(4)
    store.close()
    const reopened = await createJournalStore(file)
    expect(reopened.bootstrap().trades).toHaveLength(4)
    reopened.close()
  })

  it("rolls back every copy and account-status change when any destination is invalid", async () => {
    const { file, store } = await open()
    store.saveProfile({ ...store.bootstrap().profile, defaultCurrency: "USD" })
    const data = store.createTrackedAccount({
      name: "Evaluation",
      color: "cyan",
      tracker: tracking,
    })
    const id = data.accounts.find((a) => a.name === "Evaluation")!.id
    const before = fs.readFileSync(file)
    expect(() =>
      store.saveTrades({
        ...trade({ accountId: id }),
        accountIds: [id, "missing"],
        payload: {
          ...trade({ accountId: id }).payload,
          markAccountBlown: true,
        },
      }),
    ).toThrow("active account")
    expect(store.bootstrap().trades).toHaveLength(0)
    expect(store.bootstrap().accountTrackers.find((t) => t.accountId === id)?.status).toBe(
      "evaluation",
    )
    expect(fs.readFileSync(file)).toEqual(before)
    expect(() => store.saveTrades({ ...trade({ accountId: id }), accountIds: [] })).toThrow(
      "at least one",
    )
    expect(() =>
      store.saveTrades({
        ...trade({ accountId: id }),
        accountIds: [id],
        image: { fileName: "bad", contentType: "text/plain", bytes: new Uint8Array([1]) },
      }),
    ).toThrow("JPEG")
    expect(store.bootstrap().trades).toHaveLength(0)
    store.close()
  })

  it("copies an existing trade with edited risk/result and screenshot, without altering its source", async () => {
    const { store } = await open()
    const account = store.addAccount({ name: "Other", color: "cyan" })
    const original = store.saveTrade(trade({ accountId: "default-account" }))
    const [copy] = store.saveTrades({
      payload: { ...trade({ accountId: account.id }).payload, riskAmount: 200, pnlAmount: 600 },
      accountIds: [account.id],
      copyFromTradeId: original.id,
    })
    expect(copy).toMatchObject({
      accountId: account.id,
      riskAmount: 200,
      pnlAmount: 600,
      rMultiple: 3,
      tradedAt: original.tradedAt,
      source: "manual",
      sourceImportId: null,
    })
    expect(copy.image?.url).toBe(original.image?.url)
    expect(store.bootstrap().trades.find((t) => t.id === original.id)).toEqual(original)
    const [withoutImage] = store.saveTrades({
      ...trade({ accountId: account.id }),
      image: null,
      removeImage: true,
      accountIds: [account.id],
      copyFromTradeId: original.id,
    })
    expect(withoutImage.image).toBeNull()
    store.close()
  })

  it("rejects mixed currencies and inactive destinations", async () => {
    const { store } = await open()
    store.saveProfile({ ...store.bootstrap().profile, defaultCurrency: "GBP" })
    const data = store.createTrackedAccount({ name: "USD", color: "cyan", tracker: tracking })
    const id = data.accounts.find((a) => a.name === "USD")!.id
    expect(() =>
      store.saveTrades({ ...trade({ accountId: id }), accountIds: [id, "default-account"] }),
    ).toThrow("same currency")
    const original = store.saveTrade(trade({ accountId: "default-account" }))
    expect(() =>
      store.saveTrades({
        ...trade({ accountId: id }),
        accountIds: [id],
        copyFromTradeId: original.id,
      }),
    ).toThrow("same currency")
    store.updateAccount({
      id: "default-account",
      changes: {
        name: "Default Account",
        color: "cyan",
        archived: true,
      },
    })
    expect(() =>
      store.saveTrades({
        ...trade({ accountId: "default-account" }),
        accountIds: ["default-account"],
      }),
    ).toThrow("active account")
    store.saveAccountTracker({ id, tracker: { ...tracking, status: "blown" } })
    expect(() => store.saveTrades({ ...trade({ accountId: id }), accountIds: [id] })).toThrow(
      "evaluation or live",
    )
    expect(store.bootstrap().trades).toHaveLength(1)
    store.close()
  })

  it("restores memory after a failed disk write so a retry saves only one batch", async () => {
    const { store } = await open()
    const rename = vi.spyOn(fs, "renameSync").mockImplementationOnce(() => {
      throw new Error("Disk unavailable")
    })
    try {
      expect(() =>
        store.saveTrades({
          ...trade({ accountId: "default-account" }),
          accountIds: ["default-account"],
        }),
      ).toThrow("Disk unavailable")
      expect(store.bootstrap().trades).toHaveLength(0)
    } finally {
      rename.mockRestore()
    }
    store.saveTrades({
      ...trade({ accountId: "default-account" }),
      accountIds: ["default-account"],
    })
    expect(store.bootstrap().trades).toHaveLength(1)
    store.close()
  })
})
