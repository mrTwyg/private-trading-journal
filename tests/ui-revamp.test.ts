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
    expect(read("components/journal/journal-shell.tsx")).toContain('className="app-titlebar"')
    const form = read("components/journal/trade-form-dialog.tsx")
    expect(form).toContain("<DateTimeField")
    expect(form).toContain('["NQ", "ES", "MNQ", "MES"]')
  })

  it("keeps calendar-date logging and screenshot zoom discoverable", () => {
    expect(read("components/journal/day-trades-sheet.tsx")).toContain("Log a trade for this day")
    expect(read("components/journal/trade-details-sheet.tsx")).toContain(
      'aria-label="Enlarge trade screenshot"',
    )
  })

  it("centres dialog content inside the wide modal viewport", () => {
    const dialog = read("components/ui/dialog.tsx")
    expect(dialog).toContain('className="flex w-full max-w-[95vw] justify-center')
    expect(dialog).toMatch(/className=\{cn\(\s*"relative mx-auto/)
  })

  it("supports separate account calendars and defaults new trades to the selected account", () => {
    const form = read("components/journal/trade-form-dialog.tsx")
    expect(form).toContain('selectedAccountId === "all" || account.id === selectedAccountId')
    expect(form).toContain('<Field label="Account"')
    expect(read("components/journal/journal-workspace.tsx")).toContain(
      "trades.filter((trade) => trade.accountId === selectedAccountId)",
    )
  })
})
