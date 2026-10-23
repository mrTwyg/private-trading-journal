import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import { describe, expect, it, vi } from "vitest"

const require = createRequire(import.meta.url)
const cases = [
  {
    method: "createTrackedAccount",
    channel: "journal:create-tracked-account",
    input: { name: "Evaluation", color: "cyan", tracker: { status: "evaluation" } },
  },
  {
    method: "deleteAccount",
    channel: "journal:delete-account",
    input: { id: "account", confirmationName: "Evaluation" },
  },
  {
    method: "saveAccountTracker",
    channel: "journal:save-account-tracker",
    input: { id: "account", tracker: { status: "evaluation" } },
  },
  {
    method: "passAccount",
    channel: "journal:pass-account",
    input: { id: "account", openingBalance: 50000 },
  },
  {
    method: "adjustAccount",
    channel: "journal:adjust-account",
    input: { id: "account", amount: -100, reason: "Withdrawal" },
  },
  {
    method: "addMetadata",
    channel: "journal:add-metadata",
    input: { type: "tag", name: "Patient" },
  },
  {
    method: "deleteMetadata",
    channel: "journal:delete-metadata",
    input: { type: "tag", id: "tag" },
  },
  {
    method: "addAccount",
    channel: "journal:add-account",
    input: { name: "Evaluation", color: "cyan" },
  },
  {
    method: "updateAccount",
    channel: "journal:update-account",
    input: { id: "account", changes: { name: "Live", color: "cyan", archived: false } },
  },
]

function bridge() {
  const handlers = new Map<string, (event: object, input: unknown) => unknown>()
  const store = Object.fromEntries(cases.map(({ method }) => [method, vi.fn(() => "saved")]))
  const invoke = vi.fn(async (channel: string, input: unknown) => handlers.get(channel)!({}, input))
  let api: Record<string, (input: unknown) => Promise<unknown>> = {}
  const electron = {
    app: {
      setName: vi.fn(),
      setAppUserModelId: vi.fn(),
      on: vi.fn(),
      whenReady: () => ({ then: vi.fn() }),
    },
    ipcMain: {
      handle: (channel: string, handler: (event: object, input: unknown) => unknown) =>
        handlers.set(channel, handler),
    },
    ipcRenderer: { invoke },
    contextBridge: {
      exposeInMainWorld: (_name: string, value: typeof api) => {
        api = value
      },
    },
  }
  const context = vm.createContext({
    require: (name: string) => {
      if (name === "electron") return electron
      if (name === "./database.cjs" || name === "./codex-inbox.cjs") return {}
      if (name === "node:fs" || name === "node:path") return require(name)
      throw new Error(`Unexpected module: ${name}`)
    },
    mockStore: store,
    mockInbox: { refreshContext: vi.fn() },
  })
  // Register handlers without running Electron startup or opening a database/inbox.
  for (const file of ["main.cjs", "preload.cjs"])
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../electron", file), "utf8"), context)
  vm.runInContext("store = mockStore; codexInbox = mockInbox; registerHandlers()", context)
  return { api, store, invoke }
}

describe("desktop object arguments", () => {
  it.each(cases)(
    "passes $method through preload and main with named fields",
    async ({ method, channel, input }) => {
      const { api, store, invoke } = bridge()
      const result = await api[method](input)
      expect(invoke).toHaveBeenCalledExactlyOnceWith(channel, input)
      expect(store[method]).toHaveBeenCalledExactlyOnceWith(input)
      expect(result).toBe(method === "deleteMetadata" ? undefined : "saved")
    },
  )

  it.each(cases.filter(({ method }) => ["addAccount", "saveAccountTracker"].includes(method)))(
    "does not expose persistence controls through $method",
    async ({ method, input }) => {
      const { api, store } = bridge()
      await api[method]({ ...input, persistNow: false })
      expect(store[method]).toHaveBeenCalledExactlyOnceWith(input)
    },
  )
})
