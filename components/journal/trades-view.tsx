import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Trade, TradingAccount } from "@/lib/types"
import { AccountSelect, TradeRow } from "@/components/journal/shared"

export function TradesView({
  trades,
  accounts,
  selectedAccountId,
  onAccountChange,
  onSelectTrade,
}: {
  trades: Trade[]
  accounts: TradingAccount[]
  selectedAccountId: string
  onAccountChange: (id: string) => void
  onSelectTrade: (trade: Trade) => void
}) {
  const [query, setQuery] = useState("")
  const [outcome, setOutcome] = useState("all")
  const filtered = trades
    .filter(
      (trade) =>
        !query ||
        `${trade.symbol} ${trade.setupName ?? ""} ${trade.tags.map((tag) => tag.name).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .filter((trade) => outcome === "all" || trade.outcome === outcome)
    .sort((a, b) => b.tradedAt.localeCompare(a.tradedAt))

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header gap-3 max-sm:flex-col max-sm:items-stretch">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search symbol, setup or tag"
            className="pl-9"
            aria-label="Search trades"
          />
        </div>
        <AccountSelect accounts={accounts} value={selectedAccountId} onChange={onAccountChange} />
        <Select aria-label="Outcome filter" value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="win">Wins</SelectItem>
            <SelectItem value="loss">Losses</SelectItem>
            <SelectItem value="breakeven">Breakeven</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        {filtered.length ? (
          filtered.map((trade) => (
            <TradeRow key={trade.id} trade={trade} onClick={() => onSelectTrade(trade)} />
          ))
        ) : (
          <div className="empty-state">
            <Search />
            <h3>No matching trades</h3>
            <p>Try changing the search or outcome filter.</p>
          </div>
        )}
      </div>
    </section>
  )
}
