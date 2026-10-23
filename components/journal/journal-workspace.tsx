import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AccountsView } from "@/components/accounts-view"
import type {
  JournalBootstrap,
  JournalDesktopApi,
  CodexImportReceipt,
  CodexIntegrationStatus,
  Setup,
  Tag,
  Trade,
  TradingAccount,
  TradeDraft as CodexDraft,
  TradeFormSaveInput,
} from "@/lib/types"
import { formatMoney, formatR, signedPnl, tradesForDay } from "@/lib/trading"
import { type Page, JournalShell } from "@/components/journal/journal-shell"
import { TradeFormDialog } from "@/components/journal/trade-form-dialog"
import { DayTradesSheet } from "@/components/journal/day-trades-sheet"
import {
  TradeDetailsSheet,
  TradeImageDialog,
  DeleteTradeDialog,
} from "@/components/journal/trade-details-sheet"
import { CalendarView } from "@/components/journal/calendar-view"
import { TradesView } from "@/components/journal/trades-view"
import { InboxView } from "@/components/journal/inbox-view"
import { OrganiseView } from "@/components/journal/organise-view"
import { SettingsView } from "@/components/journal/settings-view"

export function JournalWorkspace({
  initial,
  api,
}: {
  initial: JournalBootstrap
  api: JournalDesktopApi
}) {
  const [page, setPage] = useState<Page>("calendar")
  const [trades, setTrades] = useState(initial.trades)
  const [accounts, setAccounts] = useState(initial.accounts)
  const [firms, setFirms] = useState(initial.firms)
  const [trackers, setTrackers] = useState(initial.accountTrackers)
  const [setups, setSetups] = useState(initial.setups)
  const [tags, setTags] = useState(initial.tags)
  const [drafts, setDrafts] = useState(initial.drafts)
  const [profile, setProfile] = useState(initial.profile)
  const [formOpen, setFormOpen] = useState(false)
  const [copyingTrade, setCopyingTrade] = useState<Trade | null>(null)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [editingDraft, setEditingDraft] = useState<CodexDraft | null>(null)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [newTradeDay, setNewTradeDay] = useState<Date | null>(null)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [deleteTrade, setDeleteTrade] = useState<Trade | null>(null)
  const [dataLocation, setDataLocation] = useState("")
  const [codexStatus, setCodexStatus] = useState<CodexIntegrationStatus | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState("all")
  const reloadAccounts = (data: JournalBootstrap) => {
    setAccounts(data.accounts)
    setTrackers(data.accountTrackers)
    setFirms(data.firms)
    setTrades(data.trades)
    setDrafts(data.drafts)
    setSelectedAccountId((id) => (data.accounts.some((account) => account.id === id) ? id : "all"))
    setSelectedTrade((trade) =>
      trade && data.trades.some((item) => item.id === trade.id) ? trade : null,
    )
  }

  useEffect(() => {
    let current = true
    api
      .load()
      .then((data) => {
        if (current) {
          setAccounts(data.accounts)
          setTrackers(data.accountTrackers)
        }
      })
      .catch(() => toast.error("Could not refresh account balances."))
    return () => {
      current = false
    }
  }, [api, trades])

  useEffect(() => {
    api
      .dataLocation()
      .then(setDataLocation)
      .catch(() => setDataLocation("Your private app data folder"))
    api
      .codexStatus()
      .then(setCodexStatus)
      .catch(() => setCodexStatus(null))
  }, [api])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = profile.theme
    root.dataset.accent = profile.accent
    root.dataset.density = profile.density
    root.dataset.corners = profile.corners
    root.dataset.font = profile.fontMode
    root.dataset.motion = profile.motion
    root.dataset.glow = profile.glow
    root.style.colorScheme = profile.theme === "alloy" ? "light" : "dark"
    api.setWindowChrome(profile.theme).catch(() => undefined)
  }, [
    api,
    profile.theme,
    profile.accent,
    profile.density,
    profile.corners,
    profile.fontMode,
    profile.motion,
    profile.glow,
  ])

  useEffect(
    () =>
      api.onCodexImport((receipt: CodexImportReceipt) => {
        api
          .load()
          .then((data) => {
            setTrades(data.trades)
            setAccounts(data.accounts)
            setSetups(data.setups)
            setTags(data.tags)
            setDrafts(data.drafts)
            if (receipt.status === "saved") {
              const imported = data.trades.find((trade) => trade.id === receipt.tradeId)
              toast.success(
                imported
                  ? `${imported.symbol} ${imported.direction} saved: ${formatMoney({ value: imported.pnlAmount, currency: imported.currency })}, ${formatR(imported.rMultiple)}`
                  : receipt.message,
                {
                  action: {
                    label: "Undo",
                    onClick: () => {
                      void api
                        .undoImport(receipt.importId)
                        .then(() => api.load())
                        .then((fresh) => {
                          setTrades(fresh.trades)
                          setDrafts(fresh.drafts)
                          toast.success("Import undone")
                        })
                    },
                  },
                },
              )
            } else if (receipt.status === "draft") {
              toast.info("Codex entry saved as a draft", {
                description: receipt.message,
                action: { label: "View", onClick: () => setPage("inbox") },
              })
            } else if (receipt.status === "rejected")
              toast.error("Codex import rejected", { description: receipt.message })
          })
          .catch(() => toast.error("The journal changed, but the screen could not refresh."))
      }),
    [api],
  )

  const currentSelectedTrade = selectedTrade
    ? (trades.find((trade) => trade.id === selectedTrade.id) ?? null)
    : null
  const visibleTrades =
    selectedAccountId === "all"
      ? trades
      : trades.filter((trade) => trade.accountId === selectedAccountId)
  const dayTrades = selectedDay
    ? tradesForDay({ trades: visibleTrades, day: selectedDay }).sort((a, b) =>
        b.tradedAt.localeCompare(a.tradedAt),
      )
    : []

  const openNewTrade = (day: Date | null = null) => {
    setEditingTrade(null)
    setEditingDraft(null)
    setCopyingTrade(null)
    setNewTradeDay(day)
    setSelectedDay(null)
    setFormOpen(true)
  }

  const saveTrade = async ({ draft, image, removeImage, accountIds }: TradeFormSaveInput) => {
    const pnl = signedPnl({ outcome: draft.outcome, resultAmount: draft.resultAmount })
    const payload = {
      accountId: draft.accountId,
      markAccountBlown: draft.markAccountBlown,
      tradedAt: new Date(draft.tradedAt).toISOString(),
      symbol: draft.symbol,
      direction: draft.direction,
      setupId: draft.setupId || null,
      setupDescription: draft.setupDescription,
      riskAmount: draft.riskAmount,
      outcome: draft.outcome,
      pnlAmount: pnl,
      noteHtml: draft.noteHtml,
      tagIds: draft.tagIds,
    }

    const input = {
      id: editingTrade?.id,
      payload,
      image: image
        ? {
            fileName: image.name,
            contentType: image.type,
            bytes: new Uint8Array(await image.arrayBuffer()),
          }
        : null,
      removeImage,
    }
    const storedTrades = editingDraft
      ? [await api.completeDraft({ ...input, id: undefined, draftId: editingDraft.id })]
      : editingTrade
        ? [await api.saveTrade(input)]
        : await api.saveTrades({ ...input, accountIds, copyFromTradeId: copyingTrade?.id })
    setTrades((items) =>
      editingTrade
        ? items.map((item) => (item.id === storedTrades[0].id ? storedTrades[0] : item))
        : [...storedTrades, ...items],
    )
    toast.success(
      editingTrade
        ? "Trade updated"
        : `Trade saved to ${storedTrades.length} account${storedTrades.length === 1 ? "" : "s"}`,
    )
    if (editingDraft) setDrafts((items) => items.filter((item) => item.id !== editingDraft.id))
    setEditingTrade(null)
    setEditingDraft(null)
  }

  const duplicateTrade = (trade: Trade) => {
    setCopyingTrade(trade)
    setEditingTrade(null)
    setEditingDraft(null)
    setNewTradeDay(null)
    setSelectedTrade(null)
    setFormOpen(true)
  }

  const removeTrade = async (trade: Trade) => {
    await api.deleteTrade(trade.id)
    setTrades((items) => items.filter((item) => item.id !== trade.id))
    setSelectedTrade(null)
    setDeleteTrade(null)
  }

  const addMetadata = async ({ type, name }: { type: "setup" | "tag"; name: string }) => {
    try {
      const item = await api.addMetadata({ type, name })
      if (type === "setup") setSetups((items) => [...items, item as Setup])
      else setTags((items) => [...items, item as Tag])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that item.")
      return
    }
  }

  const deleteMetadata = async ({ type, id }: { type: "setup" | "tag"; id: string }) => {
    await api.deleteMetadata({ type, id })
    if (type === "setup") setSetups((items) => items.filter((item) => item.id !== id))
    else setTags((items) => items.filter((item) => item.id !== id))
  }

  const deleteAccount = async ({
    account,
    confirmationName,
  }: {
    account: TradingAccount
    confirmationName: string
  }) => {
    reloadAccounts(await api.deleteAccount({ id: account.id, confirmationName }))
    toast.success("Account permanently deleted")
  }

  const addFirm = async (name: string) => {
    const firm = await api.addFirm(name)
    setFirms((items) => [...items, firm].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const deleteFirm = async (id: string) => {
    await api.deleteFirm(id)
    setFirms((items) => items.filter((firm) => firm.id !== id))
  }

  const updateAccount = async (account: TradingAccount) => {
    try {
      const saved = await api.updateAccount({ id: account.id, changes: account })
      setAccounts((items) => items.map((item) => (item.id === saved.id ? saved : item)))
      if (saved.archived && selectedAccountId === saved.id) setSelectedAccountId("all")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the account.")
    }
  }

  const saveProfile = async () => {
    const storedProfile = await api.saveProfile(profile)
    setProfile(storedProfile)
  }

  const backup = async () => {
    const result = await api.backup()
    if (!result.canceled) toast.success("Backup saved", { description: result.filePath })
  }

  const restore = async () => {
    const result = await api.restore()
    if (result.canceled || !result.data) return
    setTrades(result.data.trades)
    setAccounts(result.data.accounts)
    setFirms(result.data.firms)
    setTrackers(result.data.accountTrackers)
    setSetups(result.data.setups)
    setTags(result.data.tags)
    setProfile(result.data.profile)
    setDrafts(result.data.drafts)
    setSelectedTrade(null)
    setSelectedDay(null)
    toast.success("Backup restored")
  }

  const deleteCodexDraft = async (draft: CodexDraft) => {
    await api.deleteDraft(draft.id)
    setDrafts((items) => items.filter((item) => item.id !== draft.id))
    toast.success("Draft deleted")
  }

  const enableCodex = async () => setCodexStatus(await api.enableCodex())
  const disableCodex = async () => {
    setCodexStatus(await api.disableCodex())
    toast.success("Codex helper disabled")
  }

  return (
    <JournalShell
      page={page}
      setPage={setPage}
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      profile={profile}
      draftCount={drafts.length}
      onLogTrade={() => openNewTrade()}
      overlays={
        <>
          <TradeFormDialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open)
              if (!open) {
                setCopyingTrade(null)
                setEditingTrade(null)
                setEditingDraft(null)
                setNewTradeDay(null)
              }
            }}
            profile={profile}
            accounts={accounts}
            trackers={trackers}
            selectedAccountId={selectedAccountId}
            setups={setups}
            tags={tags}
            trade={editingTrade}
            copyTrade={copyingTrade}
            importDraft={editingDraft}
            selectedDay={newTradeDay}
            onSave={saveTrade}
          />
          <DayTradesSheet
            selectedDay={selectedDay}
            dayTrades={dayTrades}
            currency={profile.defaultCurrency}
            onClose={() => setSelectedDay(null)}
            onLogTrade={openNewTrade}
            onSelectTrade={setSelectedTrade}
          />
          <TradeDetailsSheet
            trade={currentSelectedTrade}
            onClose={() => setSelectedTrade(null)}
            onEdit={(trade) => {
              setEditingTrade(trade)
              setSelectedTrade(null)
              setFormOpen(true)
            }}
            onDuplicate={duplicateTrade}
            onDelete={setDeleteTrade}
            onZoom={setZoomedImage}
          />
          <TradeImageDialog zoomedImage={zoomedImage} onClose={() => setZoomedImage(null)} />
          <DeleteTradeDialog
            trade={deleteTrade}
            onClose={() => setDeleteTrade(null)}
            onDelete={removeTrade}
          />
        </>
      }
    >
      {page === "accounts" && (
        <AccountsView
          accounts={accounts}
          trackers={trackers}
          firms={firms}
          api={api}
          onReload={reloadAccounts}
        />
      )}
      {page === "calendar" && (
        <CalendarView
          trades={visibleTrades}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onAccountChange={(id) => {
            setSelectedAccountId(id)
            setSelectedDay(null)
          }}
          currency={profile.defaultCurrency}
          onSelectDay={setSelectedDay}
          onSelectTrade={setSelectedTrade}
        />
      )}
      {page === "trades" && (
        <TradesView
          trades={visibleTrades}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          onSelectTrade={setSelectedTrade}
        />
      )}
      {page === "inbox" && (
        <InboxView
          drafts={drafts}
          onReview={(draft) => {
            setEditingTrade(null)
            setEditingDraft(draft)
            setFormOpen(true)
          }}
          onDelete={deleteCodexDraft}
        />
      )}
      {page === "organise" && (
        <OrganiseView
          accounts={accounts}
          setups={setups}
          tags={tags}
          firms={firms}
          onAdd={addMetadata}
          onDelete={deleteMetadata}
          onManageAccounts={() => setPage("accounts")}
          onDeleteAccount={deleteAccount}
          onAddFirm={addFirm}
          onDeleteFirm={deleteFirm}
          onUpdateAccount={updateAccount}
        />
      )}
      {page === "settings" && (
        <SettingsView
          profile={profile}
          setProfile={setProfile}
          onSave={saveProfile}
          onBackup={backup}
          onRestore={restore}
          dataLocation={dataLocation}
          codexStatus={codexStatus}
          onEnableCodex={enableCodex}
          onDisableCodex={disableCodex}
          onOpenInbox={api.openCodexInbox}
        />
      )}
    </JournalShell>
  )
}
