import { format } from "date-fns"
import { CalendarDays, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Trade } from "@/lib/types"
import { formatTradePnl } from "@/lib/trading"
import { TradeRow } from "@/components/journal/shared"

export function DayTradesSheet({
  selectedDay,
  dayTrades,
  currency,
  onClose,
  onLogTrade,
  onSelectTrade,
}: {
  selectedDay: Date | null
  dayTrades: Trade[]
  currency: string
  onClose: () => void
  onLogTrade: (day: Date) => void
  onSelectTrade: (trade: Trade) => void
}) {
  return (
    <Sheet open={Boolean(selectedDay)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-[var(--border-strong)] bg-[var(--surface-1)] sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {selectedDay ? format(selectedDay, "EEEE, d MMMM") : "Trading day"}
          </SheetTitle>
          <SheetDescription>
            {dayTrades.length
              ? `${dayTrades.length} ${dayTrades.length === 1 ? "trade" : "trades"} · ${formatTradePnl(dayTrades, currency)}`
              : "No trades logged."}
          </SheetDescription>
          {selectedDay && (
            <Button className="mt-4" onClick={() => onLogTrade(selectedDay)}>
              <Plus /> Log a trade for this day
            </Button>
          )}
        </SheetHeader>
        <div className="border-t border-border">
          {dayTrades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} onClick={() => onSelectTrade(trade)} />
          ))}
          {!dayTrades.length && (
            <div className="empty-state">
              <CalendarDays />
              <h3>Clear day</h3>
              <p>No trades were logged on this date.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
