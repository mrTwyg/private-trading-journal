/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs")
const path = require("node:path")
const { randomUUID } = require("node:crypto")
const initSqlJs = require("sql.js")
const sanitizeHtml = require("sanitize-html")

const schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS profile (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, default_currency TEXT NOT NULL, timezone TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, color TEXT NOT NULL DEFAULT 'cyan', archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)));
  CREATE TABLE IF NOT EXISTS setups (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE);
  CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, color TEXT NOT NULL DEFAULT 'cyan');
  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY, account_id TEXT REFERENCES accounts(id), traded_at TEXT NOT NULL, symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    setup_id TEXT REFERENCES setups(id) ON DELETE SET NULL, setup_description TEXT NOT NULL DEFAULT '',
    risk_amount REAL NOT NULL CHECK (risk_amount > 0), currency TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('win', 'loss', 'breakeven')),
    pnl_amount REAL NOT NULL, r_multiple REAL NOT NULL, note_html TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual', source_import_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS trade_tags (
    trade_id TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (trade_id, tag_id)
  );
  CREATE TABLE IF NOT EXISTS trade_images (
    id TEXT PRIMARY KEY, trade_id TEXT NOT NULL UNIQUE REFERENCES trades(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL, content_type TEXT NOT NULL, bytes BLOB NOT NULL
  );
  CREATE TABLE IF NOT EXISTS trade_drafts (
    id TEXT PRIMARY KEY, import_id TEXT NOT NULL UNIQUE, payload_json TEXT NOT NULL,
    missing_fields_json TEXT NOT NULL, uncertain_fields_json TEXT NOT NULL, warnings_json TEXT NOT NULL,
    image_file_name TEXT, image_content_type TEXT, image_bytes BLOB, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS import_receipts (
    import_id TEXT PRIMARY KEY, status TEXT NOT NULL, trade_id TEXT, draft_id TEXT,
    message TEXT NOT NULL, warnings_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
  );
`

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxImageBytes = 10 * 1024 * 1024
const requiredImportFields = ["tradedAt", "symbol", "direction", "riskAmount", "outcome", "resultAmount"]
const allowedInstruments = new Set(["NQ", "ES", "MNQ", "MES"])
const allowedAccountColors = new Set(["cyan", "emerald", "violet", "amber"])

function rows(db, sql, params = []) {
  const statement = db.prepare(sql)
  try {
    statement.bind(params)
    const result = []
    while (statement.step()) result.push(statement.getAsObject())
    return result
  } finally { statement.free() }
}

function one(db, sql, params = []) { return rows(db, sql, params)[0] ?? null }
function run(db, sql, params = []) { db.run(sql, params) }

function cleanNote(value) {
  return sanitizeHtml(String(value ?? ""), {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] }, allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: (_tagName, attribs) => ({ tagName: "a", attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } }) },
  })
}

function cleanShort(value, max = 160) { return String(value ?? "").trim().slice(0, max) }
function cleanInstrument(value) {
  const symbol = cleanShort(value, 30).toUpperCase()
  const normalized = symbol.endsWith("1!") ? symbol.slice(0, -2) : symbol
  return allowedInstruments.has(normalized) ? normalized : ""
}
function parseJson(value, fallback) { try { return JSON.parse(String(value ?? "")) } catch { return fallback } }

function assertTradePayload(payload) {
  if (!payload || !cleanInstrument(payload.symbol)) throw new Error("Choose NQ, ES, MNQ, or MES.")
  if (!payload.tradedAt || Number.isNaN(new Date(payload.tradedAt).getTime())) throw new Error("Choose a valid trade date and time.")
  if (!Number.isFinite(payload.riskAmount) || payload.riskAmount <= 0) throw new Error("Risk must be greater than zero.")
  if (!["long", "short"].includes(payload.direction)) throw new Error("Choose a valid direction.")
  if (!["win", "loss", "breakeven"].includes(payload.outcome)) throw new Error("Choose a valid outcome.")
  if (!Number.isFinite(payload.pnlAmount)) throw new Error("Enter a valid result amount.")
  if (payload.outcome === "win" && payload.pnlAmount <= 0) throw new Error("A winning trade must have a positive result.")
  if (payload.outcome === "loss" && payload.pnlAmount >= 0) throw new Error("A losing trade must have a negative result.")
  if (payload.outcome === "loss" && Math.abs(Math.abs(payload.pnlAmount) - payload.riskAmount) > 0.0001) throw new Error("For a loss, the amount lost must equal the risk amount.")
  if (payload.outcome === "breakeven" && payload.pnlAmount !== 0) throw new Error("A breakeven trade must have a zero result.")
}

function imageDataUrl(imageRow) {
  if (!imageRow?.bytes) return null
  return `data:${imageRow.content_type};base64,${Buffer.from(imageRow.bytes).toString("base64")}`
}

async function createJournalStore(databasePath) {
  const sqlJsDirectory = path.dirname(require.resolve("sql.js/dist/sql-wasm.js"))
  const SQL = await initSqlJs({ locateFile: (file) => path.join(sqlJsDirectory, file) })
  fs.mkdirSync(path.dirname(databasePath), { recursive: true })
  let db = fs.existsSync(databasePath) ? new SQL.Database(fs.readFileSync(databasePath)) : new SQL.Database()

  function persist() { fs.writeFileSync(databasePath, Buffer.from(db.export())) }
  function ensureColumn(table, column, definition) {
    if (!rows(db, `PRAGMA table_info(${table})`).map((item) => String(item.name)).includes(column)) run(db, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }

  function initialize() {
    db.run(schema)
    ensureColumn("trades", "setup_description", "TEXT NOT NULL DEFAULT ''")
    ensureColumn("trades", "source", "TEXT NOT NULL DEFAULT 'manual'")
    ensureColumn("trades", "source_import_id", "TEXT")
    ensureColumn("trades", "account_id", "TEXT")
    ensureColumn("profile", "theme", "TEXT NOT NULL DEFAULT 'midnight'")
    ensureColumn("profile", "accent", "TEXT NOT NULL DEFAULT 'theme'")
    ensureColumn("profile", "density", "TEXT NOT NULL DEFAULT 'comfortable'")
    ensureColumn("profile", "corners", "TEXT NOT NULL DEFAULT 'rounded'")
    ensureColumn("profile", "font_mode", "TEXT NOT NULL DEFAULT 'clean'")
    ensureColumn("profile", "motion", "TEXT NOT NULL DEFAULT 'system'")
    ensureColumn("profile", "glow", "TEXT NOT NULL DEFAULT 'subtle'")
    if (!one(db, "SELECT id FROM accounts LIMIT 1")) run(db, "INSERT INTO accounts (id, name, color) VALUES ('default-account', 'Default Account', 'cyan')")
    const defaultAccount = one(db, "SELECT id FROM accounts WHERE archived = 0 ORDER BY name LIMIT 1") || one(db, "SELECT id FROM accounts ORDER BY name LIMIT 1")
    run(db, "UPDATE trades SET account_id = ? WHERE account_id IS NULL OR account_id = ''", [defaultAccount.id])
    run(db, "UPDATE trades SET symbol = 'NQ' WHERE UPPER(symbol) = 'NQ1!'")
    run(db, "UPDATE trades SET symbol = 'ES' WHERE UPPER(symbol) = 'ES1!'")
    run(db, "UPDATE trades SET symbol = 'MNQ' WHERE UPPER(symbol) = 'MNQ1!'")
    run(db, "UPDATE trades SET symbol = 'MES' WHERE UPPER(symbol) = 'MES1!'")
    run(db, "CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_source_import_id ON trades(source_import_id) WHERE source_import_id IS NOT NULL")
    run(db, "PRAGMA user_version = 4")
    if (!one(db, "SELECT id FROM profile LIMIT 1")) {
      run(db, "INSERT INTO profile (id, display_name, default_currency, timezone) VALUES (?, ?, ?, ?)", ["local-user", "Trader", "GBP", Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London"])
      for (const name of ["Liquidity sweep", "Opening range", "Trend continuation", "Reversal"]) run(db, "INSERT INTO setups (id, name) VALUES (?, ?)", [randomUUID(), name])
      for (const name of ["A+ setup", "Patient entry", "Late entry", "FOMO"]) run(db, "INSERT INTO tags (id, name, color) VALUES (?, ?, 'cyan')", [randomUUID(), name])
    }
    persist()
  }

  function hydrateTrade(row) {
    const tradeTags = rows(db, "SELECT tags.id, tags.name, tags.color FROM tags JOIN trade_tags ON trade_tags.tag_id = tags.id WHERE trade_tags.trade_id = ? ORDER BY tags.name", [row.id])
      .map((tag) => ({ id: String(tag.id), name: String(tag.name), color: String(tag.color) }))
    const storedImage = one(db, "SELECT id, trade_id, file_name, content_type, bytes FROM trade_images WHERE trade_id = ?", [row.id])
    return {
      id: String(row.id), accountId: String(row.account_id), accountName: String(row.account_name ?? "Default Account"), accountColor: String(row.account_color ?? "cyan"), tradedAt: String(row.traded_at), symbol: String(row.symbol), direction: String(row.direction),
      setupId: row.setup_id ? String(row.setup_id) : null, setupName: row.setup_name ? String(row.setup_name) : null,
      setupDescription: String(row.setup_description ?? ""), riskAmount: Number(row.risk_amount), currency: String(row.currency),
      outcome: String(row.outcome), pnlAmount: Number(row.pnl_amount), rMultiple: Number(row.r_multiple), noteHtml: String(row.note_html ?? ""), tags: tradeTags,
      image: storedImage ? { id: String(storedImage.id), tradeId: String(storedImage.trade_id), fileName: String(storedImage.file_name), contentType: String(storedImage.content_type), url: imageDataUrl(storedImage) } : null,
      createdAt: String(row.created_at), updatedAt: String(row.updated_at), source: String(row.source ?? "manual"), sourceImportId: row.source_import_id ? String(row.source_import_id) : null,
    }
  }

  function hydrateDraft(row) {
    const payload = parseJson(row.payload_json, {})
    return {
      id: String(row.id), importId: String(row.import_id), tradedAt: payload.tradedAt ?? null, symbol: String(payload.symbol ?? ""), direction: payload.direction ?? null,
      setupName: payload.setupName ?? null, setupDescription: String(payload.setupDescription ?? ""), tagNames: Array.isArray(payload.tagNames) ? payload.tagNames.map(String) : [],
      riskAmount: Number.isFinite(payload.riskAmount) ? Number(payload.riskAmount) : null, outcome: payload.outcome ?? null,
      resultAmount: Number.isFinite(payload.resultAmount) ? Number(payload.resultAmount) : null, noteHtml: cleanNote(payload.noteHtml),
      missingFields: parseJson(row.missing_fields_json, []), uncertainFields: parseJson(row.uncertain_fields_json, []), warnings: parseJson(row.warnings_json, []),
      image: row.image_bytes ? { fileName: String(row.image_file_name), contentType: String(row.image_content_type), url: imageDataUrl({ content_type: row.image_content_type, bytes: row.image_bytes }) } : null,
      createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    }
  }

  function getTrade(id) {
    const row = one(db, "SELECT trades.*, setups.name AS setup_name, accounts.name AS account_name, accounts.color AS account_color FROM trades LEFT JOIN setups ON setups.id = trades.setup_id LEFT JOIN accounts ON accounts.id = trades.account_id WHERE trades.id = ?", [id])
    if (!row) throw new Error("Trade not found.")
    return hydrateTrade(row)
  }

  function bootstrap() {
    const storedProfile = one(db, "SELECT * FROM profile LIMIT 1")
    return {
      profile: {
        id: String(storedProfile.id), email: "", displayName: String(storedProfile.display_name), defaultCurrency: String(storedProfile.default_currency), timezone: String(storedProfile.timezone),
        theme: String(storedProfile.theme ?? "midnight"), accent: String(storedProfile.accent ?? "theme"), density: String(storedProfile.density ?? "comfortable"),
        corners: String(storedProfile.corners ?? "rounded"), fontMode: String(storedProfile.font_mode ?? "clean"), motion: String(storedProfile.motion ?? "system"), glow: String(storedProfile.glow ?? "subtle"),
      },
      accounts: rows(db, "SELECT id, name, color, archived FROM accounts ORDER BY archived, name").map((item) => ({ id: String(item.id), name: String(item.name), color: String(item.color), archived: Boolean(item.archived) })),
      setups: rows(db, "SELECT id, name FROM setups ORDER BY name").map((item) => ({ id: String(item.id), name: String(item.name) })),
      tags: rows(db, "SELECT id, name, color FROM tags ORDER BY name").map((item) => ({ id: String(item.id), name: String(item.name), color: String(item.color) })),
      trades: rows(db, "SELECT trades.*, setups.name AS setup_name, accounts.name AS account_name, accounts.color AS account_color FROM trades LEFT JOIN setups ON setups.id = trades.setup_id LEFT JOIN accounts ON accounts.id = trades.account_id ORDER BY trades.traded_at DESC").map(hydrateTrade),
      drafts: rows(db, "SELECT * FROM trade_drafts ORDER BY created_at DESC").map(hydrateDraft), demoMode: false,
    }
  }

  function saveTrade(input) {
    const { payload } = input
    assertTradePayload(payload)
    const now = new Date().toISOString(), id = input.id || randomUUID()
    const existing = input.id ? one(db, "SELECT * FROM trades WHERE id = ?", [input.id]) : null
    if (input.id && !existing) throw new Error("Trade not found.")
    const profile = one(db, "SELECT default_currency FROM profile LIMIT 1")
    const risk = Number(payload.riskAmount), pnl = Number(payload.pnlAmount), rMultiple = Number((pnl / risk).toFixed(4))
    const setupExists = payload.setupId ? one(db, "SELECT id FROM setups WHERE id = ?", [payload.setupId]) : null
    const accountId = cleanShort(payload.accountId, 100) || String(existing?.account_id ?? one(db, "SELECT id FROM accounts WHERE archived = 0 ORDER BY name LIMIT 1")?.id ?? "")
    const account = one(db, "SELECT id, archived FROM accounts WHERE id = ?", [accountId])
    if (!account || (account.archived && String(existing?.account_id ?? "") !== accountId)) throw new Error("Choose an active account.")
    const currency = existing ? String(existing.currency) : String(profile.default_currency)
    const source = existing ? String(existing.source ?? "manual") : input.source === "codex" ? "codex" : "manual"
    const sourceImportId = existing ? existing.source_import_id : input.sourceImportId || null
    db.run("BEGIN")
    try {
      if (existing) {
        run(db, "UPDATE trades SET account_id = ?, traded_at = ?, symbol = ?, direction = ?, setup_id = ?, setup_description = ?, risk_amount = ?, outcome = ?, pnl_amount = ?, r_multiple = ?, note_html = ?, updated_at = ? WHERE id = ?", [accountId, payload.tradedAt, cleanInstrument(payload.symbol), payload.direction, setupExists ? payload.setupId : null, cleanShort(payload.setupDescription, 1000), risk, payload.outcome, pnl, rMultiple, cleanNote(payload.noteHtml), now, id])
      } else {
        run(db, "INSERT INTO trades (id, account_id, traded_at, symbol, direction, setup_id, setup_description, risk_amount, currency, outcome, pnl_amount, r_multiple, note_html, source, source_import_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, accountId, payload.tradedAt, cleanInstrument(payload.symbol), payload.direction, setupExists ? payload.setupId : null, cleanShort(payload.setupDescription, 1000), risk, currency, payload.outcome, pnl, rMultiple, cleanNote(payload.noteHtml), source, sourceImportId, now, now])
      }
      run(db, "DELETE FROM trade_tags WHERE trade_id = ?", [id])
      for (const tagId of [...new Set(payload.tagIds ?? [])]) if (one(db, "SELECT id FROM tags WHERE id = ?", [tagId])) run(db, "INSERT INTO trade_tags (trade_id, tag_id) VALUES (?, ?)", [id, tagId])
      if (input.removeImage) run(db, "DELETE FROM trade_images WHERE trade_id = ?", [id])
      if (input.image) {
        if (!allowedImageTypes.has(input.image.contentType)) throw new Error("Choose a JPEG, PNG, or WebP image.")
        const imageBytes = Buffer.from(input.image.bytes)
        if (imageBytes.byteLength > maxImageBytes) throw new Error("The image must be 10 MB or smaller.")
        run(db, "DELETE FROM trade_images WHERE trade_id = ?", [id])
        run(db, "INSERT INTO trade_images (id, trade_id, file_name, content_type, bytes) VALUES (?, ?, ?, ?, ?)", [randomUUID(), id, path.basename(String(input.image.fileName || "trade-image")), input.image.contentType, imageBytes])
      }
      db.run("COMMIT"); persist(); return getTrade(id)
    } catch (error) { db.run("ROLLBACK"); throw error }
  }

  function ensureNamedItem(type, rawName) {
    const name = cleanShort(rawName, 60)
    if (!name) return null
    const table = type === "setup" ? "setups" : "tags", found = one(db, `SELECT id FROM ${table} WHERE name = ? COLLATE NOCASE`, [name])
    if (found) return String(found.id)
    const id = randomUUID()
    if (type === "setup") run(db, "INSERT INTO setups (id, name) VALUES (?, ?)", [id, name])
    else run(db, "INSERT INTO tags (id, name, color) VALUES (?, ?, 'cyan')", [id, name])
    return id
  }

  function receiptFromRow(row, statusOverride) {
    return { importId: String(row.import_id), status: statusOverride ?? String(row.status), tradeId: row.trade_id ? String(row.trade_id) : null, draftId: row.draft_id ? String(row.draft_id) : null, message: String(row.message), warnings: parseJson(row.warnings_json, []), createdAt: String(row.created_at) }
  }

  function processCodexImport(rawPayload, importedImage = null, imageWarning = "") {
    const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {}, importId = cleanShort(payload.importId, 100)
    if (!importId || payload.schemaVersion !== 1 || payload.source !== "codex") throw new Error("Unsupported or malformed Codex import package.")
    const previous = one(db, "SELECT * FROM import_receipts WHERE import_id = ?", [importId])
    if (previous) return { ...receiptFromRow(previous, "duplicate"), message: `Already processed as ${previous.status}.` }
    const existingTrade = one(db, "SELECT id FROM trades WHERE source_import_id = ?", [importId])
    if (existingTrade) return { importId, status: "duplicate", tradeId: String(existingTrade.id), draftId: null, message: "This trade was already imported.", warnings: [], createdAt: new Date().toISOString() }
    const normalized = {
      tradedAt: payload.tradedAt ? String(payload.tradedAt) : null, symbol: cleanInstrument(payload.symbol), direction: ["long", "short"].includes(payload.direction) ? payload.direction : null,
      setupName: cleanShort(payload.setupName, 60) || null, setupDescription: cleanShort(payload.setupDescription, 1000),
      tagNames: Array.isArray(payload.tagNames) ? [...new Set(payload.tagNames.map((name) => cleanShort(name, 60)).filter(Boolean))].slice(0, 20) : [],
      riskAmount: Number.isFinite(payload.riskAmount) ? Number(payload.riskAmount) : null, outcome: ["win", "loss", "breakeven"].includes(payload.outcome) ? payload.outcome : null,
      resultAmount: Number.isFinite(payload.resultAmount) ? Math.abs(Number(payload.resultAmount)) : null, noteHtml: cleanNote(payload.noteHtml),
    }
    const confidence = payload.fieldConfidence && typeof payload.fieldConfidence === "object" ? payload.fieldConfidence : {}
    const missing = new Set((Array.isArray(payload.missingFields) ? payload.missingFields.map(String) : []).filter((field) => requiredImportFields.includes(field))), uncertain = new Set()
    for (const field of requiredImportFields) if (["missing", "uncertain", "inferred"].includes(confidence[field])) uncertain.add(field)
    if (!normalized.tradedAt || Number.isNaN(new Date(normalized.tradedAt).getTime())) missing.add("tradedAt")
    if (!normalized.symbol) missing.add("symbol")
    if (!normalized.direction) missing.add("direction")
    if (!(normalized.riskAmount > 0)) missing.add("riskAmount")
    if (!normalized.outcome) missing.add("outcome")
    if (normalized.resultAmount === null) missing.add("resultAmount")
    if (normalized.outcome && normalized.outcome !== "breakeven" && !(normalized.resultAmount > 0)) uncertain.add("resultAmount")
    if (normalized.outcome === "breakeven" && normalized.resultAmount !== 0) uncertain.add("resultAmount")
    if (normalized.outcome === "loss" && normalized.riskAmount > 0 && normalized.resultAmount !== null && Math.abs(normalized.resultAmount - normalized.riskAmount) > 0.0001) uncertain.add("resultAmount")
    const warnings = [...new Set([imageWarning, ...(Array.isArray(payload.warnings) ? payload.warnings.map(String) : [])].filter(Boolean))], now = new Date().toISOString()
    if (missing.size || uncertain.size) {
      const draftId = randomUUID(), count = missing.size + uncertain.size
      db.run("BEGIN")
      try {
        run(db, "INSERT INTO trade_drafts (id, import_id, payload_json, missing_fields_json, uncertain_fields_json, warnings_json, image_file_name, image_content_type, image_bytes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [draftId, importId, JSON.stringify(normalized), JSON.stringify([...missing]), JSON.stringify([...uncertain]), JSON.stringify(warnings), importedImage?.fileName ?? null, importedImage?.contentType ?? null, importedImage ? Buffer.from(importedImage.bytes) : null, now, now])
        const message = `Saved as a draft; ${count} required field${count === 1 ? " needs" : "s need"} review.`
        run(db, "INSERT INTO import_receipts (import_id, status, trade_id, draft_id, message, warnings_json, created_at) VALUES (?, 'draft', NULL, ?, ?, ?, ?)", [importId, draftId, message, JSON.stringify(warnings), now])
        db.run("COMMIT"); persist(); return { importId, status: "draft", tradeId: null, draftId, message, warnings, createdAt: now }
      } catch (error) { db.run("ROLLBACK"); throw error }
    }
    const setupId = normalized.setupName ? ensureNamedItem("setup", normalized.setupName) : null
    const tagIds = normalized.tagNames.map((name) => ensureNamedItem("tag", name)).filter(Boolean)
    const pnlAmount = normalized.outcome === "loss" ? -normalized.resultAmount : normalized.outcome === "breakeven" ? 0 : normalized.resultAmount
    const trade = saveTrade({ source: "codex", sourceImportId: importId, payload: { tradedAt: new Date(normalized.tradedAt).toISOString(), symbol: normalized.symbol, direction: normalized.direction, setupId, setupDescription: normalized.setupDescription, riskAmount: normalized.riskAmount, outcome: normalized.outcome, pnlAmount, noteHtml: normalized.noteHtml, tagIds }, image: importedImage })
    const message = `${trade.symbol} ${trade.direction} saved.`
    run(db, "INSERT INTO import_receipts (import_id, status, trade_id, draft_id, message, warnings_json, created_at) VALUES (?, 'saved', ?, NULL, ?, ?, ?)", [importId, trade.id, message, JSON.stringify(warnings), now]); persist()
    return { importId, status: "saved", tradeId: trade.id, draftId: null, message, warnings, createdAt: now }
  }

  function completeDraft(input) {
    const draftRow = one(db, "SELECT * FROM trade_drafts WHERE id = ?", [input.draftId])
    if (!draftRow) throw new Error("Draft not found.")
    const storedImage = draftRow.image_bytes ? { fileName: String(draftRow.image_file_name), contentType: String(draftRow.image_content_type), bytes: Buffer.from(draftRow.image_bytes) } : null
    const trade = saveTrade({ ...input, id: undefined, source: "codex", sourceImportId: String(draftRow.import_id), image: input.image || (input.removeImage ? null : storedImage) })
    run(db, "DELETE FROM trade_drafts WHERE id = ?", [input.draftId])
    run(db, "UPDATE import_receipts SET status = 'saved', trade_id = ?, draft_id = NULL, message = ? WHERE import_id = ?", [trade.id, `${trade.symbol} ${trade.direction} saved.`, draftRow.import_id]); persist(); return trade
  }

  function deleteDraft(id) {
    const draft = one(db, "SELECT import_id FROM trade_drafts WHERE id = ?", [id])
    if (!draft) return
    run(db, "DELETE FROM trade_drafts WHERE id = ?", [id]); run(db, "UPDATE import_receipts SET status = 'undone', draft_id = NULL, message = 'Draft deleted.' WHERE import_id = ?", [draft.import_id]); persist()
  }

  function undoImport(importId) {
    const receipt = one(db, "SELECT * FROM import_receipts WHERE import_id = ?", [importId])
    if (!receipt) throw new Error("Import not found.")
    if (receipt.trade_id) run(db, "DELETE FROM trades WHERE id = ? AND source_import_id = ?", [receipt.trade_id, importId])
    if (receipt.draft_id) run(db, "DELETE FROM trade_drafts WHERE id = ? AND import_id = ?", [receipt.draft_id, importId])
    run(db, "UPDATE import_receipts SET status = 'undone', trade_id = NULL, draft_id = NULL, message = 'Import undone.' WHERE import_id = ?", [importId]); persist()
  }

  function duplicateTrade(id) {
    const source = getTrade(id)
    return saveTrade({ payload: { accountId: source.accountId, tradedAt: new Date().toISOString(), symbol: source.symbol, direction: source.direction, setupId: source.setupId, setupDescription: source.setupDescription, riskAmount: source.riskAmount, outcome: source.outcome, pnlAmount: source.pnlAmount, noteHtml: source.noteHtml, tagIds: source.tags.map((tag) => tag.id) } })
  }
  function deleteTrade(id) { run(db, "DELETE FROM trades WHERE id = ?", [id]); persist() }
  function addMetadata(type, rawName) {
    const name = cleanShort(rawName, 60), table = type === "setup" ? "setups" : type === "tag" ? "tags" : null
    if (!name) throw new Error("Enter a name first.")
    if (!table) throw new Error("Unknown item type.")
    if (one(db, `SELECT id FROM ${table} WHERE name = ? COLLATE NOCASE`, [name])) throw new Error("That name already exists.")
    const id = ensureNamedItem(type, name); persist(); return type === "setup" ? { id, name } : { id, name, color: "cyan" }
  }
  function deleteMetadata(type, id) { const table = type === "setup" ? "setups" : type === "tag" ? "tags" : null; if (!table) throw new Error("Unknown item type."); run(db, `DELETE FROM ${table} WHERE id = ?`, [id]); persist() }
  function addAccount(rawName, rawColor) {
    const name = cleanShort(rawName, 60), color = allowedAccountColors.has(rawColor) ? rawColor : "cyan"
    if (!name) throw new Error("Enter an account name first.")
    if (one(db, "SELECT id FROM accounts WHERE name = ? COLLATE NOCASE", [name])) throw new Error("That account name already exists.")
    const id = randomUUID(); run(db, "INSERT INTO accounts (id, name, color) VALUES (?, ?, ?)", [id, name, color]); persist()
    return { id, name, color, archived: false }
  }
  function updateAccount(id, changes) {
    const account = one(db, "SELECT * FROM accounts WHERE id = ?", [id])
    if (!account) throw new Error("Account not found.")
    const name = cleanShort(changes?.name, 60), color = allowedAccountColors.has(changes?.color) ? changes.color : String(account.color), archived = Boolean(changes?.archived)
    if (!name) throw new Error("Enter an account name first.")
    if (one(db, "SELECT id FROM accounts WHERE name = ? COLLATE NOCASE AND id <> ?", [name, id])) throw new Error("That account name already exists.")
    if (archived && !account.archived && Number(one(db, "SELECT COUNT(*) AS count FROM accounts WHERE archived = 0").count) <= 1) throw new Error("Keep at least one active account.")
    run(db, "UPDATE accounts SET name = ?, color = ?, archived = ? WHERE id = ?", [name, color, archived ? 1 : 0, id]); persist()
    return { id, name, color, archived }
  }
  function saveProfile(profile) {
    const displayName = cleanShort(profile.displayName, 80) || "Trader", currency = String(profile.defaultCurrency ?? "GBP").toUpperCase(), timezone = cleanShort(profile.timezone, 100) || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London"
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Choose a valid three-letter currency.")
    const pick = (value, allowed, fallback) => allowed.includes(value) ? value : fallback
    const theme = pick(profile.theme, ["midnight", "obsidian", "violet", "alloy"], "midnight")
    const accent = pick(profile.accent, ["theme", "cyan", "emerald", "violet", "amber"], "theme")
    const density = pick(profile.density, ["comfortable", "compact"], "comfortable")
    const corners = pick(profile.corners, ["rounded", "soft", "sharp"], "rounded")
    const fontMode = pick(profile.fontMode, ["clean", "technical"], "clean")
    const motion = pick(profile.motion, ["system", "reduced"], "system")
    const glow = pick(profile.glow, ["off", "subtle", "bright"], "subtle")
    run(db, "UPDATE profile SET display_name = ?, default_currency = ?, timezone = ?, theme = ?, accent = ?, density = ?, corners = ?, font_mode = ?, motion = ?, glow = ? WHERE id = 'local-user'", [displayName, currency, timezone, theme, accent, density, corners, fontMode, motion, glow]); persist(); return bootstrap().profile
  }

  function importDatabase(bytes) {
    const candidate = new SQL.Database(bytes); candidate.run("PRAGMA foreign_keys = ON")
    const check = one(candidate, "PRAGMA quick_check"), tableNames = new Set(rows(candidate, "SELECT name FROM sqlite_master WHERE type = 'table'").map((item) => String(item.name)))
    for (const required of ["profile", "setups", "tags", "trades", "trade_tags", "trade_images"]) if (!tableNames.has(required)) { candidate.close(); throw new Error("That file is not a Trading Journal backup.") }
    if (!check || String(Object.values(check)[0]).toLowerCase() !== "ok") { candidate.close(); throw new Error("The backup appears to be damaged.") }
    db.close(); db = candidate; initialize(); return bootstrap()
  }

  initialize()
  return {
    bootstrap, saveTrade, duplicateTrade, deleteTrade, addMetadata, deleteMetadata, addAccount, updateAccount, saveProfile, importDatabase,
    processCodexImport, completeDraft, deleteDraft, undoImport,
    codexContext: () => { const data = bootstrap(); return { schemaVersion: 1, defaultCurrency: data.profile.defaultCurrency, timezone: data.profile.timezone, accounts: data.accounts.filter((item) => !item.archived).map((item) => item.name), instruments: ["NQ", "ES", "MNQ", "MES"], setups: data.setups.map((item) => item.name), tags: data.tags.map((item) => item.name) } },
    exportDatabase: () => Buffer.from(db.export()), close: () => db.close(),
  }
}

module.exports = { createJournalStore }
