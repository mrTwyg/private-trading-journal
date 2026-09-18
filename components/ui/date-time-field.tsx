"use client"

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { parseDate, parseTime } from "@internationalized/date"
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Popover,
  TimeField,
} from "react-aria-components"

function splitValue(value: string) {
  const [date = "", time = ""] = value.split("T")
  return { date, time: time.slice(0, 5) }
}

function DateTimeField({ value, onChange, id = "tradedAt" }: { value: string; onChange: (value: string) => void; id?: string }) {
  const parts = splitValue(value)
  const updateDate = (date: string) => onChange(`${date}T${parts.time || "00:00"}`)
  const updateTime = (time: string) => onChange(`${parts.date || new Date().toISOString().slice(0, 10)}T${time}`)

  return (
    <div id={id} className="date-time-field">
      <DatePicker aria-label="Trade date" value={parts.date ? parseDate(parts.date) : null} onChange={(date) => date && updateDate(date.toString())}>
        <Group className="date-control">
          <DateInput className="flex min-w-0 flex-1 px-3">{(segment) => <DateSegment segment={segment} className="rounded px-0.5 text-sm outline-none data-[focused]:bg-primary data-[focused]:text-primary-foreground data-[placeholder]:text-muted-foreground" />}</DateInput>
          <Button aria-label="Open calendar" className="grid size-9 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><CalendarDays className="size-4" /></Button>
        </Group>
        <Popover className="z-[90] rounded-[calc(var(--radius)+0.2rem)] border border-border-strong bg-popover p-3 shadow-[0_24px_65px_rgb(0_0_0/40%)] outline-none entering:animate-in entering:fade-in entering:slide-in-from-top-1">
          <Dialog className="outline-none">
            <Calendar>
              <header className="mb-3 flex items-center justify-between">
                <Button slot="previous" aria-label="Previous month" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><ChevronLeft className="size-4" /></Button>
                <Heading className="text-sm font-semibold" />
                <Button slot="next" aria-label="Next month" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><ChevronRight className="size-4" /></Button>
              </header>
              <CalendarGrid className="border-separate border-spacing-1 text-center text-xs">
                {(date) => <CalendarCell date={date} className="grid size-9 place-items-center rounded-md outline-none outside-month:text-muted-foreground/40 hover:bg-accent selected:bg-primary selected:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring unavailable:line-through unavailable:opacity-40" />}
              </CalendarGrid>
            </Calendar>
          </Dialog>
        </Popover>
      </DatePicker>
      <TimeField aria-label="Trade time" value={parts.time ? parseTime(parts.time) : null} onChange={(time) => time && updateTime(time.toString().slice(0, 5))} hourCycle={24}>
        <DateInput className="time-control">{(segment) => <DateSegment segment={segment} className="rounded px-0.5 text-sm outline-none data-[focused]:bg-primary data-[focused]:text-primary-foreground data-[placeholder]:text-muted-foreground" />}</DateInput>
      </TimeField>
    </div>
  )
}

export { DateTimeField }
