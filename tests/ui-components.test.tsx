// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { I18nProvider } from "react-aria-components/I18nProvider"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { DateTimeField } from "@/components/ui/date-time-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

beforeAll(() => {
  class ResizeObserverMock { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  vi.stubGlobal("CSS", { escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`) })
  window.matchMedia ||= (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as typeof window.matchMedia
  Element.prototype.scrollIntoView ||= () => undefined
})

describe("React Aria journal controls", () => {
  it("opens the keyboard-ready instrument list", () => {
    render(
      <Select aria-label="Instrument" value="NQ" onValueChange={() => undefined}>
        <SelectTrigger><SelectValue placeholder="Choose an instrument" /></SelectTrigger>
        <SelectContent>{["NQ", "ES", "MNQ", "MES"].map((symbol) => <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>)}</SelectContent>
      </Select>,
    )
    fireEvent.click(screen.getByRole("button"))
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(expect.arrayContaining(["NQ", "ES", "MNQ", "MES"]))
  })

  it("opens a locale-aware calendar and keeps time separate", () => {
    render(<I18nProvider locale="en-GB"><DateTimeField value="2026-09-19T09:30" onChange={() => undefined} /></I18nProvider>)
    expect(screen.getByLabelText("Trade time")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Open calendar/ }))
    expect(screen.getByRole("grid")).toBeTruthy()
  })
})
