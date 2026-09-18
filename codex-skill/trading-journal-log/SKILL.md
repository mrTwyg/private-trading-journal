---
name: trading-journal-log
description: Log a dictated or screenshot-supported trade into the local Trading Journal Codex Inbox. Use for requests such as “log this trade,” “add this to my journal,” or “journal this screenshot.” Do not use for placing trades, broker actions, or financial advice.
---

# Trading Journal Log

Turn the user's description and optional local chart image into one offline Trading Journal import. Read `references/local-config.json` for this computer's inbox paths and `references/import-schema.md` before creating the package.

## Non-negotiable facts

Never invent or infer the trade date, symbol, direction, risk amount, outcome, or monetary result. A chart may support a value only when it is clearly visible. Mark any missing or ambiguous required field as missing or uncertain; the journal will save an incomplete draft that does not affect performance totals.

Setup wording, notes, and tags may be lightly inferred from the user's description. Preserve the user's direct voice and established abbreviations such as SMT, BOS, FVG, IFVG, HTF, LRL, and B/E. Do not add market analysis the user did not provide.

## Note style

- Write **setupDescription** as a short chronological chain using arrows when helpful.
- Write **noteHtml** as concise reflection: trade management, emotion, mistake, and lesson. Use simple paragraphs; do not over-polish the user's voice.
- Prefer existing setups and tags from `journal-context.json`. Only introduce a new setup or tag when the user clearly names it.

Anonymized examples:

- Setup: `London low sweep → bullish SMT → 1m IFVG → retrace into FVG → target hit`
- Notes: `<p>Exited early before news. The original target later hit; next time decide the news rule before entry.</p>`
- Setup: `15m inverse → 5m FVG tap → 2m confirmation`
- Notes: `<p>Moved to B/E at internal liquidity. Entry followed the plan, but management was too defensive.</p>`

## Workflow

1. Read the local config and current journal context. Interpret relative dates in the saved timezone and include an ISO-8601 offset.
2. Extract only supported facts. Use absolute result amounts; the journal applies the outcome sign and calculates R.
3. When a screenshot has a resolvable local path, include it. The submission script calculates its checksum. If the attachment has no accessible path, omit it and mention that it was not imported.
4. Create one schema-v1 JSON manifest in a temporary workspace location. Give every required field an explicit confidence value.
5. Submit it atomically with `scripts/submit-trade.ps1 -ManifestPath <absolute-json-path>`.
6. Read the matching receipt when it appears. Report exactly one of: saved trade, saved draft, duplicate, or rejected. If the app is closed and no receipt exists yet, say the entry is queued for the next app launch.

Do not write to the SQLite database, edit processed packages, or claim success without a receipt.

