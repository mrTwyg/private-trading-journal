import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { afterEach, describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const { createJournalStore } = require("../electron/database.cjs")
const { createCodexInbox } = require("../electron/codex-inbox.cjs")
const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

describe("Codex inbox", () => {
  it("installs the local skill and atomically processes a manifest with an image", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "journal-inbox-test-"))
    temporaryDirectories.push(root)
    const documentsPath = path.join(root, "Documents")
    const codexHome = path.join(root, ".codex")
    const skillSourcePath = path.join(root, "skill-source")
    fs.mkdirSync(skillSourcePath, { recursive: true })
    fs.writeFileSync(path.join(skillSourcePath, "SKILL.md"), "---\nname: trading-journal-log\ndescription: test\n---\n")
    const store = await createJournalStore(path.join(root, "journal.sqlite"))
    const receipts: Array<{ status: string }> = []
    const inbox = createCodexInbox({ documentsPath, codexHome, skillSourcePath, store, onReceipt: (receipt: { status: string }) => receipts.push(receipt) })

    const enabled = inbox.enable()
    expect(enabled.enabled).toBe(true)
    expect(fs.existsSync(path.join(enabled.skillPath, "references", "local-config.json"))).toBe(true)

    const imagePath = path.join(root, "chart.png")
    const imageBytes = Buffer.from([137, 80, 78, 71])
    fs.writeFileSync(imagePath, imageBytes)
    const importId = "inbox-complete-1"
    const manifest = {
      schemaVersion: 1, importId, source: "codex", createdAt: new Date().toISOString(),
      tradedAt: "2026-09-18T09:30:00+01:00", symbol: "ES1!", direction: "long", riskAmount: 100,
      outcome: "win", resultAmount: 250, setupDescription: "Sweep → BOS → FVG", noteHtml: "<p>Patient entry.</p>",
      screenshot: { path: imagePath, sha256: crypto.createHash("sha256").update(imageBytes).digest("hex") },
      fieldConfidence: { tradedAt: "explicit", symbol: "explicit", direction: "explicit", riskAmount: "explicit", outcome: "explicit", resultAmount: "explicit" },
      missingFields: [],
    }
    fs.writeFileSync(path.join(enabled.inboxPath, "pending", `${importId}.json`), JSON.stringify(manifest))
    inbox.scan()

    expect(store.bootstrap().trades).toHaveLength(1)
    expect(receipts.at(-1)?.status).toBe("saved")
    expect(fs.existsSync(path.join(enabled.inboxPath, "receipts", `${importId}.receipt.json`))).toBe(true)
    expect(fs.existsSync(path.join(enabled.inboxPath, "processed", `${importId}.json`))).toBe(true)
    expect(inbox.disable().enabled).toBe(false)
    store.close()
  })

  it("keeps text when a screenshot checksum is invalid", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "journal-inbox-test-"))
    temporaryDirectories.push(root)
    const skillSourcePath = path.join(root, "skill-source")
    fs.mkdirSync(skillSourcePath, { recursive: true })
    fs.writeFileSync(path.join(skillSourcePath, "SKILL.md"), "test")
    const store = await createJournalStore(path.join(root, "journal.sqlite"))
    const receipts: Array<{ status: string; warnings: string[] }> = []
    const inbox = createCodexInbox({ documentsPath: path.join(root, "Documents"), codexHome: path.join(root, ".codex"), skillSourcePath, store, onReceipt: (receipt: { status: string; warnings: string[] }) => receipts.push(receipt) })
    const status = inbox.enable()
    const imagePath = path.join(root, "chart.png")
    fs.writeFileSync(imagePath, Buffer.from([1, 2, 3]))
    const importId = "bad-image-1"
    fs.writeFileSync(path.join(status.inboxPath, "pending", `${importId}.json`), JSON.stringify({
      schemaVersion: 1, importId, source: "codex", createdAt: new Date().toISOString(), tradedAt: "2026-09-18T10:00:00Z",
      symbol: "MES", direction: "short", riskAmount: 100, outcome: "breakeven", resultAmount: 0,
      screenshot: { path: imagePath, sha256: "0".repeat(64) }, fieldConfidence: { tradedAt: "explicit", symbol: "explicit", direction: "explicit", riskAmount: "explicit", outcome: "explicit", resultAmount: "explicit" }, missingFields: [],
    }))
    inbox.scan()
    expect(store.bootstrap().trades).toHaveLength(1)
    expect(receipts[0].warnings[0]).toContain("checksum")
    store.close()
  })
})
