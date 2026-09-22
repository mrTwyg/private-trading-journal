export type TradeDirection = "long" | "short"
export type TradeOutcome = "win" | "loss" | "breakeven"
export type Instrument = "NQ" | "ES" | "MNQ" | "MES"
export type JournalTheme = "midnight" | "obsidian" | "violet" | "alloy"
export type JournalAccent = "theme" | "cyan" | "emerald" | "violet" | "amber"
export type JournalDensity = "comfortable" | "compact"
export type JournalCorners = "rounded" | "soft" | "sharp"
export type JournalFont = "clean" | "technical"
export type JournalMotion = "system" | "reduced"
export type JournalGlow = "off" | "subtle" | "bright"

export type Setup = {
  id: string
  name: string
}

export type Tag = {
  id: string
  name: string
  color: string
}

export type TradingAccount = {
  id: string
  name: string
  color: string
  archived: boolean
}

export type TradeImage = {
  id: string
  tradeId: string
  fileName: string
  contentType: string
  url?: string | null
}

export type Trade = {
  id: string
  accountId: string
  accountName: string
  accountColor: string
  tradedAt: string
  symbol: string
  direction: TradeDirection
  setupId: string | null
  setupName: string | null
  setupDescription: string
  riskAmount: number
  currency: string
  outcome: TradeOutcome
  pnlAmount: number
  rMultiple: number
  noteHtml: string
  tags: Tag[]
  image?: TradeImage | null
  createdAt: string
  updatedAt: string
  source: "manual" | "codex"
  sourceImportId: string | null
}

export type Profile = {
  id: string
  email: string
  displayName: string
  defaultCurrency: string
  timezone: string
  theme: JournalTheme
  accent: JournalAccent
  density: JournalDensity
  corners: JournalCorners
  fontMode: JournalFont
  motion: JournalMotion
  glow: JournalGlow
}

export type TradeFormValues = {
  accountId: string
  tradedAt: string
  symbol: string
  direction: TradeDirection
  setupId: string
  setupDescription: string
  tagIds: string[]
  riskAmount: number
  outcome: TradeOutcome
  resultAmount: number
  noteHtml: string
}

export type CodexRequiredField = "tradedAt" | "symbol" | "direction" | "riskAmount" | "outcome" | "resultAmount"
export type ImportFieldConfidence = "explicit" | "inferred" | "uncertain" | "missing"

export type CodexTradeImportV1 = {
  schemaVersion: 1
  importId: string
  source: "codex"
  createdAt: string
  tradedAt?: string | null
  symbol?: string | null
  direction?: TradeDirection | null
  setupName?: string | null
  setupDescription?: string | null
  tagNames?: string[]
  riskAmount?: number | null
  outcome?: TradeOutcome | null
  resultAmount?: number | null
  noteHtml?: string | null
  screenshot?: {
    path: string
    sha256: string
  } | null
  fieldConfidence?: Partial<Record<CodexRequiredField | "setupDescription" | "noteHtml" | "tags", ImportFieldConfidence>>
  inferredFields?: string[]
  missingFields?: string[]
}

export type TradeDraft = {
  id: string
  importId: string
  tradedAt: string | null
  symbol: string
  direction: TradeDirection | null
  setupName: string | null
  setupDescription: string
  tagNames: string[]
  riskAmount: number | null
  outcome: TradeOutcome | null
  resultAmount: number | null
  noteHtml: string
  missingFields: string[]
  uncertainFields: string[]
  warnings: string[]
  image?: { fileName: string; contentType: string; url: string } | null
  createdAt: string
  updatedAt: string
}

export type CodexImportReceipt = {
  importId: string
  status: "saved" | "draft" | "duplicate" | "rejected" | "undone"
  tradeId?: string | null
  draftId?: string | null
  message: string
  warnings: string[]
  createdAt: string
}

export type CodexIntegrationStatus = {
  enabled: boolean
  inboxPath: string
  skillPath: string
  pendingCount: number
}

export type JournalBootstrap = {
  profile: Profile
  accounts: TradingAccount[]
  trades: Trade[]
  setups: Setup[]
  tags: Tag[]
  drafts: TradeDraft[]
  demoMode: boolean
}

export type DesktopTradePayload = {
  accountId: string
  tradedAt: string
  symbol: string
  direction: TradeDirection
  setupId: string | null
  setupDescription?: string
  riskAmount: number
  outcome: TradeOutcome
  pnlAmount: number
  noteHtml: string
  tagIds: string[]
}

export type DesktopImagePayload = {
  fileName: string
  contentType: string
  bytes: Uint8Array
}

export type DesktopSaveTradeInput = {
  id?: string
  payload: DesktopTradePayload
  image?: DesktopImagePayload | null
  removeImage?: boolean
}

export type DesktopOperationResult = {
  canceled?: boolean
  filePath?: string
  data?: JournalBootstrap
}

export type JournalDesktopApi = {
  load: () => Promise<JournalBootstrap>
  saveTrade: (input: DesktopSaveTradeInput) => Promise<Trade>
  duplicateTrade: (id: string) => Promise<Trade>
  deleteTrade: (id: string) => Promise<void>
  addMetadata: (type: "setup" | "tag", name: string) => Promise<Setup | Tag>
  deleteMetadata: (type: "setup" | "tag", id: string) => Promise<void>
  addAccount: (name: string, color: string) => Promise<TradingAccount>
  updateAccount: (id: string, changes: Pick<TradingAccount, "name" | "color" | "archived">) => Promise<TradingAccount>
  saveProfile: (profile: Profile) => Promise<Profile>
  backup: () => Promise<DesktopOperationResult>
  restore: () => Promise<DesktopOperationResult>
  dataLocation: () => Promise<string>
  setWindowChrome: (theme: Profile["theme"]) => Promise<void>
  codexStatus: () => Promise<CodexIntegrationStatus>
  enableCodex: () => Promise<CodexIntegrationStatus>
  disableCodex: () => Promise<CodexIntegrationStatus>
  openCodexInbox: () => Promise<void>
  deleteDraft: (id: string) => Promise<void>
  completeDraft: (input: DesktopSaveTradeInput & { draftId: string }) => Promise<Trade>
  undoImport: (importId: string) => Promise<void>
  onCodexImport: (callback: (receipt: CodexImportReceipt) => void) => () => void
}

declare global {
  interface Window {
    journalApi?: JournalDesktopApi
  }
}
