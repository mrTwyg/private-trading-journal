import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("UI revamp architecture", () => {
  it("uses React Aria without the retired component stacks", () => {
    const manifest = JSON.parse(read("package.json"))
    expect(manifest.dependencies["react-aria-components"]).toBeTruthy()
    expect(manifest.dependencies["@internationalized/date"]).toBeTruthy()
    expect(manifest.dependencies["radix-ui"]).toBeUndefined()
    expect(manifest.dependencies["@base-ui/react"]).toBeUndefined()
    expect(manifest.dependencies["@shadcn/react"]).toBeUndefined()
  })

  it("configures integrated native Windows title-bar controls", () => {
    const main = read("electron/main.cjs")
    expect(main).toContain('titleBarStyle: "hidden"')
    expect(main).toContain("titleBarOverlay")
    expect(main).toContain('ipcMain.handle("window:set-chrome"')
  })

  it("renders the precision shell and accessible date-time control", () => {
    const app = read("app/journal-app.tsx")
    expect(app).toContain('className="app-titlebar"')
    expect(app).toContain("<DateTimeField")
    expect(app).toContain('["NQ", "ES", "MNQ", "MES"]')
  })

  it("keeps calendar-date logging and screenshot zoom discoverable", () => {
    const app = read("app/journal-app.tsx")
    expect(app).toContain("Log a trade for this day")
    expect(app).toContain('aria-label="Enlarge trade screenshot"')
  })

  it("centres dialog content inside the wide modal viewport", () => {
    const dialog = read("components/ui/dialog.tsx")
    expect(dialog).toContain('className="flex w-full max-w-[95vw] justify-center')
    expect(dialog).toContain('className={cn("relative mx-auto')
  })

  it("supports separate account calendars and defaults new trades to the selected account", () => {
    const app = read("app/journal-app.tsx")
    expect(app).toContain('selectedAccountId !== "all" ? selectedAccountId')
    expect(app).toContain('<Field label="Account"')
    expect(app).toContain('trades.filter((trade) => trade.accountId === selectedAccountId)')
  })
})
