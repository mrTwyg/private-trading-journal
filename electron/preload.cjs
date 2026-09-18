/* eslint-disable @typescript-eslint/no-require-imports */

const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("journalApi", {
  load: () => ipcRenderer.invoke("journal:load"),
  saveTrade: (input) => ipcRenderer.invoke("journal:save-trade", input),
  duplicateTrade: (id) => ipcRenderer.invoke("journal:duplicate-trade", id),
  deleteTrade: (id) => ipcRenderer.invoke("journal:delete-trade", id),
  addMetadata: (type, name) => ipcRenderer.invoke("journal:add-metadata", type, name),
  deleteMetadata: (type, id) => ipcRenderer.invoke("journal:delete-metadata", type, id),
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
