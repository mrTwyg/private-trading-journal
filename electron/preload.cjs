/* eslint-disable @typescript-eslint/no-require-imports */

const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("journalApi", {
  load: () => ipcRenderer.invoke("journal:load"),
  createTrackedAccount: (input) => ipcRenderer.invoke("journal:create-tracked-account", input),
  deleteAccount: (input) => ipcRenderer.invoke("journal:delete-account", input),
  addFirm: (name) => ipcRenderer.invoke("journal:add-firm", name),
  deleteFirm: (id) => ipcRenderer.invoke("journal:delete-firm", id),
  saveAccountTracker: (input) => ipcRenderer.invoke("journal:save-account-tracker", input),
  passAccount: (input) => ipcRenderer.invoke("journal:pass-account", input),
  adjustAccount: (input) => ipcRenderer.invoke("journal:adjust-account", input),
  saveTrades: (input) => ipcRenderer.invoke("journal:save-trades", input),
  saveTrade: (input) => ipcRenderer.invoke("journal:save-trade", input),
  duplicateTrade: (id) => ipcRenderer.invoke("journal:duplicate-trade", id),
  deleteTrade: (id) => ipcRenderer.invoke("journal:delete-trade", id),
  addMetadata: (input) => ipcRenderer.invoke("journal:add-metadata", input),
  deleteMetadata: (input) => ipcRenderer.invoke("journal:delete-metadata", input),
  addAccount: (input) => ipcRenderer.invoke("journal:add-account", input),
  updateAccount: (input) => ipcRenderer.invoke("journal:update-account", input),
  saveProfile: (profile) => ipcRenderer.invoke("journal:save-profile", profile),
  backup: () => ipcRenderer.invoke("journal:backup"),
  restore: () => ipcRenderer.invoke("journal:restore"),
  dataLocation: () => ipcRenderer.invoke("journal:data-location"),
  setWindowChrome: (theme) => ipcRenderer.invoke("window:set-chrome", theme),
  codexStatus: () => ipcRenderer.invoke("codex:status"),
  enableCodex: () => ipcRenderer.invoke("codex:enable"),
  disableCodex: () => ipcRenderer.invoke("codex:disable"),
  openCodexInbox: () => ipcRenderer.invoke("codex:open-inbox"),
  deleteDraft: (id) => ipcRenderer.invoke("codex:delete-draft", id),
  completeDraft: (input) => ipcRenderer.invoke("codex:complete-draft", input),
  undoImport: (importId) => ipcRenderer.invoke("codex:undo-import", importId),
  onCodexImport: (callback) => {
    const listener = (_event, receipt) => callback(receipt)
    ipcRenderer.on("codex:imported", listener)
    return () => ipcRenderer.removeListener("codex:imported", listener)
  },
})
