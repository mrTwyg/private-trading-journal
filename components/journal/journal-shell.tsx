import { format } from "date-fns"
import {
  BookOpen,
  CalendarDays,
  HardDrive,
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"

export type Page = "calendar" | "trades" | "accounts" | "inbox" | "organise" | "settings"

const pageCopy: Record<Page, { title: string; description: string }> = {
  accounts: { title: "Accounts", description: "Track purchases, balances and progress." },
  calendar: { title: "Calendar", description: "Review the shape of your trading." },
  trades: { title: "Trade journal", description: "Every decision, in one place." },
  inbox: { title: "Codex inbox", description: "Review voice and screenshot imports." },
  organise: { title: "Setups & tags", description: "Keep your review language consistent." },
  settings: { title: "Settings", description: "Your journal preferences." },
}

const navItems: { id: Page; label: string; icon: typeof CalendarDays }[] = [
  { id: "accounts", label: "Accounts", icon: HardDrive },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "trades", label: "Trades", icon: BookOpen },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "organise", label: "Setups & tags", icon: SlidersHorizontal },
  { id: "settings", label: "Settings", icon: Settings },
]

export function JournalShell({
  page,
  setPage,
  sidebarCollapsed,
  setSidebarCollapsed,
  profile,
  draftCount,
  onLogTrade,
  children,
  overlays,
}: {
  page: Page
  setPage: (page: Page) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  profile: Profile
  draftCount: number
  onLogTrade: () => void
  children: React.ReactNode
  overlays: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "app-frame min-h-screen bg-background text-foreground",
        sidebarCollapsed && "sidebar-collapsed",
      )}
    >
      <a href="#main-content" className="skip-link">
        Skip to journal
      </a>
      <div className="app-titlebar">
        <div className="titlebar-brand">
          <span className="brand-glyph">J</span>
          <strong>Trading Journal</strong>
        </div>
        <div className="titlebar-status">
          <span className="status-pip bg-[var(--success)]" />
          <span>Private · saved locally</span>
        </div>
        <div className="window-controls-space" aria-hidden="true" />
      </div>
      <aside className="app-sidebar">
        <Button
          variant="ghost"
          size="icon-sm"
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((value) => !value)}
          aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
        <nav className="mt-3 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => setPage(item.id)}
                className={cn("nav-item", page === item.id && "nav-item-active")}
                aria-current={page === item.id ? "page" : undefined}
              >
                <Icon />
                <span>{item.label}</span>
                {item.id === "inbox" && draftCount > 0 && (
                  <span className="nav-count" aria-label={`${draftCount} drafts`}>
                    {draftCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="account-chip">
            <span className="account-avatar">{profile.displayName.slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0">
              <strong className="truncate">{profile.displayName}</strong>
              <small className="truncate">Offline · this computer</small>
            </span>
            <HardDrive className="ml-auto size-4 text-[var(--accent-cyan)]" aria-hidden="true" />
          </div>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-header">
          <div>
            <p className="eyebrow">{format(new Date(), "EEEE, d MMMM")}</p>
            <div className="flex items-baseline gap-3">
              <h1>{pageCopy[page].title}</h1>
              <p>{pageCopy[page].description}</p>
            </div>
          </div>
          <Button size="lg" onClick={onLogTrade}>
            <Plus /> Log trade
          </Button>
        </header>
        <main id="main-content" className="main-workspace" tabIndex={-1}>
          {children}
        </main>
      </div>

      {overlays}
    </div>
  )
}
