import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { afterEach, describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
type JournalStore = {
  bootstrap: () => {
    profile: { displayName: string; defaultCurrency: string; timezone: string; theme: string; accent: string; density: string; corners: string; fontMode: string; motion: string; glow: string }
    accounts: Array<{ id: string; name: string; color: string; archived: boolean }>
    trades: Array<{ id: string; accountId: string; accountName: string }>
    drafts: Array<{ id: string; importId: string; missingFields: string[]; uncertainFields: string[] }>
    setups: Array<{ id: string }>
    tags: Array<{ id: string }>
  }
  saveTrade: (input: { payload: Record<string, unknown>; image?: { fileName: string; contentType: string; bytes: Uint8Array } }) => { id: string; rMultiple: number; noteHtml: string; image?: { url?: string } }
  duplicateTrade: (id: string) => { id: string; image: null }
  deleteTrade: (id: string) => void
  importDatabase: (bytes: Uint8Array) => ReturnType<JournalStore["bootstrap"]>
  exportDatabase: () => Uint8Array
  processCodexImport: (payload: Record<string, unknown>, image?: { fileName: string; contentType: string; bytes: Uint8Array } | null, warning?: string) => { status: string; importId: string; tradeId?: string; draftId?: string; warnings: string[] }
  completeDraft: (input: { draftId: string; payload: Record<string, unknown> }) => { id: string; pnlAmount: number; rMultiple: number }
  undoImport: (importId: string) => void
  saveProfile: (profile: Record<string, unknown>) => { theme: string; accent: string; density: string; corners: string; fontMode: string; motion: string; glow: string }
  addAccount: (name: string, color: string) => { id: string; name: string; color: string; archived: boolean }
  updateAccount: (id: string, changes: Record<string, unknown>) => { id: string; name: string; color: string; archived: boolean }
  close: () => void
}
const { createJournalStore } = require("../electron/database.cjs") as {
  createJournalStore: (databasePath: string) => Promise<JournalStore>
}

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

describe("offline journal database", () => {
  it("creates a private local database and persists a trade", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "journal-test-"))
    temporaryDirectories.push(directory)
    const databasePath = path.join(directory, "journal.sqlite")
    const store = await createJournalStore(databasePath)
    const initial = store.bootstrap()

    expect(initial.trades).toHaveLength(0)
    expect(initial.accounts).toEqual([{ id: "default-account", name: "Default Account", color: "cyan", archived: false }])
    expect(initial.setups.length).toBeGreaterThan(0)

    const trade = store.saveTrade({
      payload: {
        tradedAt: "2026-09-18T10:00:00.000Z",
        symbol: "NQ1!",
        direction: "long",
        setupId: initial.setups[0].id,
        riskAmount: 100,
        outcome: "win",
        pnlAmount: 250,
        noteHtml: "<p>Patient entry</p><script>alert('no')</script>",
        tagIds: [initial.tags[0].id],
      },
    })

    expect(trade.rMultiple).toBe(2.5)
    expect(trade.noteHtml).not.toContain("script")
    expect(store.bootstrap().trades).toHaveLength(1)
    expect(fs.existsSync(databasePath)).toBe(true)
    store.close()
  })

  it("keeps each trade on its selected account", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "journal-test-"))
    temporaryDirectories.push(directory)
    const store = await createJournalStore(path.join(directory, "journal.sqlite"))
    const account = store.addAccount("Evaluation", "violet")
    const trade = store.saveTrade({ payload: { accountId: account.id, tradedAt: "2026-09-18T10:00:00.000Z", symbol: "MNQ", direction: "long", setupId: null, riskAmount: 100, outcome: "win", pnlAmount: 200, noteHtml: "", tagIds: [] } })

    expect(trade).toMatchObject({ accountId: account.id, accountName: "Evaluation" })
    expect(store.bootstrap().accounts).toHaveLength(2)
    expect(store.updateAccount(account.id, { ...account, archived: true }).archived).toBe(true)
    expect(() => store.saveTrade({ payload: { accountId: account.id, tradedAt: "2026-09-19T10:00:00.000Z", symbol: "MNQ", direction: "long", setupId: null, riskAmount: 100, outcome: "win", pnlAmount: 200, noteHtml: "", tagIds: [] } })).toThrow("active account")
    store.close()
  })

  it("rejects invalid risk and invalid outcome signs", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "journal-test-"))
    temporaryDirectories.push(directory)
    const store = await createJournalStore(path.join(directory, "journal.sqlite"))
    const base = {
      tradedAt: "2026-09-18T10:00:00.000Z",
      symbol: "ES1!",
      direction: "short",
      setupId: null,
      outcome: "loss",
      noteHtml: "",
      tagIds: [],
    }

    expect(() => store.saveTrade({ payload: { ...base, riskAmount: 0, pnlAmount: -10 } })).toThrow("Risk")
    expect(() => store.saveTrade({ payload: { ...base, riskAmount: 100, pnlAmount: 10 } })).toThrow("negative")
    expect(() => store.saveTrade({ payload: { ...base, riskAmount: 100, pnlAmount: -50 } })).toThrow("equal the risk")
    expect(() => store.saveTrade({ payload: { ...base, symbol: "CL", riskAmount: 100, pnlAmount: -100 } })).toThrow("NQ, ES, MNQ, or MES")
    store.close()
  })

  it("persists appearance customisation in the local profile", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "journal-test-"))
    temporaryDirectories.push(directory)
    const store = await createJournalStore(path.join(directory, "journal.sqlite"))
    const current = store.bootstrap().profile
    expect(current.theme).toBe("midnight")
    const saved = store.saveProfile({ ...current, theme: "violet", accent: "amber", density: "compact", corners: "sharp", fontMode: "technical", motion: "reduced", glow: "bright" })
    expect(saved).toMatchObject({ theme: "violet", accent: "amber", density: "compact", corners: "sharp", fontMode: "technical", motion: "reduced", glow: "bright" })
    expect(store.bootstrap().profile.theme).toBe("violet")
    store.close()
  })

  it("keeps screenshots in the backup and supports duplicate/delete", async () => {
    const firstDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "journal-test-"))
    const secondDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "journal-test-"))
    temporaryDirectories.push(firstDirectory, secondDirectory)
    const firstStore = await createJournalStore(path.join(firstDirectory, "journal.sqlite"))
    const trade = firstStore.saveTrade({
      payload: {
        tradedAt: "2026-09-18T10:00:00.000Z",
        symbol: "MES",
        direction: "long",
        setupId: null,
        riskAmount: 100,
        outcome: "win",
        pnlAmount: 200,
        noteHtml: "<p>Plan followed.</p>",
        tagIds: [],
      },
      image: {
        fileName: "chart.png",
        contentType: "image/png",
        bytes: new Uint8Array([137, 80, 78, 71]),
      },
    })
    expect(trade.image?.url).toMatch(/^data:image\/png;base64,/)

    const duplicate = firstStore.duplicateTrade(trade.id)
    expect(duplicate.image).toBeNull()
    firstStore.deleteTrade(duplicate.id)
    expect(firstStore.bootstrap().trades).toHaveLength(1)

    const backup = firstStore.exportDatabase()
    const secondStore = await createJournalStore(path.join(secondDirectory, "journal.sqlite"))
    const restored = secondStore.importDatabase(backup)
    expect(restored.trades).toHaveLength(1)
    firstStore.close()
    secondStore.close()
  })

  it("automatically saves a complete Codex import and prevents duplicates", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "journal-test-"))
    temporaryDirectories.push(directory)
    const store = await createJournalStore(path.join(directory, "journal.sqlite"))
    const payload = {
      schemaVersion: 1,
      importId: "codex-complete-1",
      source: "codex",
      createdAt: "2026-09-18T10:00:00.000Z",
      tradedAt: "2026-09-18T09:30:00+01:00",
      symbol: "MNQ1!",
      direction: "short",
      setupName: "Liquidity sweep",
      setupDescription: "London high sweep → bearish SMT → 1m IFVG",
      tagNames: ["Patient entry"],
      riskAmount: 100,
      outcome: "loss",
      resultAmount: 100,
      noteHtml: "<p>Followed the plan.</p><script>bad()</script>",
      fieldConfidence: { tradedAt: "explicit", symbol: "explicit", direction: "explicit", riskAmount: "explicit", outcome: "explicit", resultAmount: "explicit" },
      missingFields: [],
    }

    const receipt = store.processCodexImport(payload)
    expect(receipt.status).toBe("saved")
    const data = store.bootstrap()
    expect(data.trades).toHaveLength(1)
    const imported = data.trades[0] as unknown as { pnlAmount: number; rMultiple: number; noteHtml: string }
    expect(imported.pnlAmount).toBe(-100)
    expect(imported.rMultiple).toBe(-1)
    expect(imported.noteHtml).not.toContain("script")
    expect(store.processCodexImport(payload).status).toBe("duplicate")
    expect(store.bootstrap().trades).toHaveLength(1)

    store.undoImport(payload.importId)
    expect(store.bootstrap().trades).toHaveLength(0)
    store.close()
  })

  it("keeps incomplete or inferred required facts in a non-counting draft", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "journal-test-"))
    temporaryDirectories.push(directory)
    const store = await createJournalStore(path.join(directory, "journal.sqlite"))
    const receipt = store.processCodexImport({
      schemaVersion: 1,
      importId: "codex-draft-1",
      source: "codex",
      createdAt: "2026-09-18T10:00:00.000Z",
      tradedAt: "2026-09-18T09:30:00+01:00",
      symbol: "NQ1!",
      direction: "long",
      riskAmount: null,
      outcome: "win",
      resultAmount: 200,
      fieldConfidence: { tradedAt: "explicit", symbol: "explicit", direction: "inferred", riskAmount: "missing", outcome: "explicit", resultAmount: "explicit" },
      missingFields: ["riskAmount"],
    }, null, "The screenshot was skipped.")

    expect(receipt.status).toBe("draft")
    const pending = store.bootstrap()
    expect(pending.trades).toHaveLength(0)
    expect(pending.drafts).toHaveLength(1)
    expect(pending.drafts[0].missingFields).toContain("riskAmount")
    expect(pending.drafts[0].uncertainFields).toContain("direction")

    const completed = store.completeDraft({
      draftId: pending.drafts[0].id,
      payload: { tradedAt: "2026-09-18T08:30:00.000Z", symbol: "NQ1!", direction: "long", setupId: null, setupDescription: "", riskAmount: 100, outcome: "win", pnlAmount: 200, noteHtml: "", tagIds: [] },
    })
    expect(completed.rMultiple).toBe(2)
    expect(store.bootstrap().drafts).toHaveLength(0)
    expect(store.bootstrap().trades).toHaveLength(1)
    store.close()
  })

  it("routes a mismatched loss amount to review instead of corrupting one-risk losses", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "journal-test-"))
    temporaryDirectories.push(directory)
    const store = await createJournalStore(path.join(directory, "journal.sqlite"))
    const receipt = store.processCodexImport({
      schemaVersion: 1, importId: "loss-mismatch-1", source: "codex", createdAt: new Date().toISOString(),
      tradedAt: "2026-09-18T10:00:00Z", symbol: "MNQ", direction: "long", riskAmount: 100, outcome: "loss", resultAmount: 40,
      fieldConfidence: { tradedAt: "explicit", symbol: "explicit", direction: "explicit", riskAmount: "explicit", outcome: "explicit", resultAmount: "explicit" }, missingFields: [],
    })
    expect(receipt.status).toBe("draft")
    expect(store.bootstrap().trades).toHaveLength(0)
    expect(store.bootstrap().drafts[0].uncertainFields).toContain("resultAmount")
    store.close()
  })
})
