/* eslint-disable @typescript-eslint/no-require-imports */

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron")
const fs = require("node:fs")
const path = require("node:path")

const { createJournalStore } = require("./database.cjs")
const { createCodexInbox } = require("./codex-inbox.cjs")

let mainWindow
let store
let databasePath
let codexInbox

app.setName("Trading Journal")
app.setAppUserModelId("local.tradingjournal.desktop")

function registerHandlers() {
  ipcMain.handle("journal:load", () => store.bootstrap())
  ipcMain.handle("journal:save-trade", (_event, input) => store.saveTrade(input))
  ipcMain.handle("journal:duplicate-trade", (_event, id) => store.duplicateTrade(id))
  ipcMain.handle("journal:delete-trade", (_event, id) => store.deleteTrade(id))
  ipcMain.handle("journal:add-metadata", (_event, type, name) => { const result = store.addMetadata(type, name); codexInbox.refreshContext(); return result })
  ipcMain.handle("journal:delete-metadata", (_event, type, id) => { store.deleteMetadata(type, id); codexInbox.refreshContext() })
  ipcMain.handle("journal:save-profile", (_event, profile) => { const result = store.saveProfile(profile); codexInbox.refreshContext(); return result })
  ipcMain.handle("journal:data-location", () => databasePath)
  ipcMain.handle("codex:status", () => codexInbox.status())
  ipcMain.handle("codex:enable", () => codexInbox.enable())
  ipcMain.handle("codex:disable", () => codexInbox.disable())
  ipcMain.handle("codex:open-inbox", () => shell.openPath(codexInbox.inboxPath))
  ipcMain.handle("codex:delete-draft", (_event, id) => store.deleteDraft(id))
  ipcMain.handle("codex:complete-draft", (_event, input) => { const result = store.completeDraft(input); codexInbox.refreshContext(); return result })
  ipcMain.handle("codex:undo-import", (_event, importId) => store.undoImport(importId))

  ipcMain.handle("journal:backup", async () => {
    const suggestedName = `trading-journal-backup-${new Date().toISOString().slice(0, 10)}.sqlite`
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Back up Trading Journal",
      defaultPath: path.join(app.getPath("documents"), suggestedName),
      filters: [{ name: "Trading Journal backup", extensions: ["sqlite"] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    fs.writeFileSync(result.filePath, store.exportDatabase())
    return { canceled: false, filePath: result.filePath }
  })

  ipcMain.handle("journal:restore", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Restore Trading Journal",
      properties: ["openFile"],
      filters: [{ name: "Trading Journal backup", extensions: ["sqlite"] }],
    })
    if (result.canceled || !result.filePaths[0]) return { canceled: true }
    const data = store.importDatabase(fs.readFileSync(result.filePaths[0]))
    codexInbox.refreshContext()
    return { canceled: false, filePath: result.filePaths[0], data }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#071017",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: "deny" }
  })
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const currentUrl = mainWindow.webContents.getURL()
    if (url !== currentUrl && /^https?:\/\//i.test(url)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
  mainWindow.once("ready-to-show", () => mainWindow.show())

  if (process.env.ELECTRON_START_URL) mainWindow.loadURL(process.env.ELECTRON_START_URL)
  else mainWindow.loadFile(path.join(__dirname, "..", "out", "index.html"))
}

app.whenReady().then(async () => {
  databasePath = path.join(app.getPath("userData"), "trading-journal.sqlite")
  store = await createJournalStore(databasePath)
  const skillSourcePath = app.isPackaged
    ? path.join(process.resourcesPath, "codex-skill", "trading-journal-log")
    : path.join(__dirname, "..", "codex-skill", "trading-journal-log")
  const codexHome = process.env.CODEX_HOME || path.join(app.getPath("home"), ".codex")
  codexInbox = createCodexInbox({
    // Windows can redirect the Documents shell folder into OneDrive. Keep the
    // Codex inbox on the physical local disk instead.
    documentsPath: path.join(app.getPath("home"), "Documents"), codexHome, skillSourcePath, store,
    onReceipt: (receipt) => mainWindow?.webContents.send("codex:imported", receipt),
  })
  registerHandlers()
  createWindow()
  codexInbox.start()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => { codexInbox?.stop(); store?.close() })
