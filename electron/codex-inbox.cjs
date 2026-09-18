/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")

const maxImageBytes = 10 * 1024 * 1024
const imageTypes = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  fs.renameSync(temporaryPath, filePath)
}

function createCodexInbox({ documentsPath, codexHome, skillSourcePath, store, onReceipt }) {
  const inboxPath = path.join(documentsPath, "Codex", "Trading Journal Inbox")
  const pendingPath = path.join(inboxPath, "pending")
  const processedPath = path.join(inboxPath, "processed")
  const rejectedPath = path.join(inboxPath, "rejected")
  const receiptsPath = path.join(inboxPath, "receipts")
  const skillPath = path.join(codexHome, "skills", "trading-journal-log")
  let watcher = null
  let interval = null
  let processing = false

  function ensureFolders() {
    for (const directory of [pendingPath, processedPath, rejectedPath, receiptsPath]) fs.mkdirSync(directory, { recursive: true })
  }

  function refreshContext() {
    ensureFolders()
    writeJsonAtomic(path.join(inboxPath, "journal-context.json"), { ...store.codexContext(), inboxPath, pendingPath, updatedAt: new Date().toISOString() })
  }

  function status() {
    ensureFolders()
    return {
      enabled: fs.existsSync(path.join(skillPath, "SKILL.md")), inboxPath, skillPath,
      pendingCount: fs.readdirSync(pendingPath).filter((name) => name.toLowerCase().endsWith(".json")).length,
    }
  }

  function enable() {
    ensureFolders()
    if (!fs.existsSync(skillSourcePath)) throw new Error("The bundled Codex helper could not be found. Reinstall the journal and try again.")
    fs.mkdirSync(path.dirname(skillPath), { recursive: true })
    fs.rmSync(skillPath, { recursive: true, force: true })
    fs.cpSync(skillSourcePath, skillPath, { recursive: true, force: true })
    fs.mkdirSync(path.join(skillPath, "references"), { recursive: true })
    writeJsonAtomic(path.join(skillPath, "references", "local-config.json"), { schemaVersion: 1, inboxPath, pendingPath, contextPath: path.join(inboxPath, "journal-context.json") })
    refreshContext()
    return status()
  }

  function disable() {
    fs.rmSync(skillPath, { recursive: true, force: true })
    return status()
  }

  function loadImage(screenshot) {
    if (!screenshot) return { image: null, warning: "" }
    const imagePath = path.resolve(String(screenshot.path ?? ""))
    if (!imagePath || !fs.existsSync(imagePath) || !fs.statSync(imagePath).isFile()) return { image: null, warning: "The screenshot file could not be found." }
    const contentType = imageTypes[path.extname(imagePath).toLowerCase()]
    if (!contentType) return { image: null, warning: "The screenshot was skipped because it is not a JPEG, PNG, or WebP image." }
    const bytes = fs.readFileSync(imagePath)
    if (bytes.byteLength > maxImageBytes) return { image: null, warning: "The screenshot was skipped because it is larger than 10 MB." }
    const expectedHash = String(screenshot.sha256 ?? "").trim().toLowerCase()
    const actualHash = crypto.createHash("sha256").update(bytes).digest("hex")
    if (!/^[a-f0-9]{64}$/.test(expectedHash) || actualHash !== expectedHash) return { image: null, warning: "The screenshot was skipped because its checksum did not match." }
    return { image: { fileName: path.basename(imagePath), contentType, bytes }, warning: "" }
  }

  function moveManifest(sourcePath, destinationDirectory, fallbackName) {
    const destination = path.join(destinationDirectory, `${fallbackName}.json`)
    if (fs.existsSync(destination)) fs.rmSync(destination, { force: true })
    fs.renameSync(sourcePath, destination)
  }

  function processManifest(filePath) {
    let payload
    try { payload = JSON.parse(fs.readFileSync(filePath, "utf8")) }
    catch (error) {
      const importId = path.basename(filePath, path.extname(filePath)).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || crypto.randomUUID()
      const receipt = { importId, status: "rejected", tradeId: null, draftId: null, message: "The import file was not valid JSON.", warnings: [error instanceof Error ? error.message : "Invalid JSON"], createdAt: new Date().toISOString() }
      writeJsonAtomic(path.join(receiptsPath, `${importId}.receipt.json`), receipt)
      moveManifest(filePath, rejectedPath, importId)
      onReceipt(receipt)
      return
    }

    const importId = String(payload.importId ?? path.basename(filePath, ".json")).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100) || crypto.randomUUID()
    try {
      const { image, warning } = loadImage(payload.screenshot)
      const receipt = store.processCodexImport(payload, image, warning)
      writeJsonAtomic(path.join(receiptsPath, `${importId}.receipt.json`), receipt)
      moveManifest(filePath, processedPath, importId)
      refreshContext()
      onReceipt(receipt)
    } catch (error) {
      const receipt = { importId, status: "rejected", tradeId: null, draftId: null, message: error instanceof Error ? error.message : "The import could not be processed.", warnings: [], createdAt: new Date().toISOString() }
      writeJsonAtomic(path.join(receiptsPath, `${importId}.receipt.json`), receipt)
      moveManifest(filePath, rejectedPath, importId)
      onReceipt(receipt)
    }
  }

  function scan() {
    if (processing) return
    processing = true
    try {
      ensureFolders()
      for (const name of fs.readdirSync(pendingPath).filter((item) => item.toLowerCase().endsWith(".json")).sort()) processManifest(path.join(pendingPath, name))
    } finally { processing = false }
  }

  function start() {
    ensureFolders(); refreshContext(); scan()
    watcher = fs.watch(pendingPath, { persistent: false }, () => setTimeout(scan, 150))
    interval = setInterval(scan, 5000)
  }

  function stop() {
    watcher?.close(); watcher = null
    if (interval) clearInterval(interval)
    interval = null
  }

  return { inboxPath, enable, disable, status, start, stop, scan, refreshContext }
}

module.exports = { createCodexInbox }
