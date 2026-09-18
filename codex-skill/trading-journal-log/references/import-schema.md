# Trading Journal import schema v1

Read `local-config.json` beside this file for `contextPath` and `pendingPath`. Read the context before composing an import.

A manifest has this shape:

```json
{
  "schemaVersion": 1,
  "importId": "a-new-UUID",
  "source": "codex",
  "createdAt": "2026-09-18T12:00:00.000Z",
  "tradedAt": "2026-09-18T10:15:00+01:00",
  "symbol": "MNQ",
  "direction": "long",
  "setupName": "Liquidity sweep",
  "setupDescription": "London low sweep → bullish SMT → 1m IFVG",
  "tagNames": ["Patient entry"],
  "riskAmount": 250,
  "outcome": "win",
  "resultAmount": 500,
  "noteHtml": "<p>Moved to B/E early, then re-entered after confirmation.</p>",
  "screenshot": { "path": "C:\\\\Charts\\\\trade.png", "sha256": "" },
  "fieldConfidence": {
    "tradedAt": "explicit",
    "symbol": "explicit",
    "direction": "explicit",
    "riskAmount": "explicit",
    "outcome": "explicit",
    "resultAmount": "explicit",
    "setupDescription": "inferred",
    "noteHtml": "inferred",
    "tags": "inferred"
  },
  "inferredFields": ["setupDescription", "noteHtml"],
  "missingFields": []
}
```

Rules:

- Allowed instrument: `NQ`, `ES`, `MNQ`, or `MES` (older `NQ1!`-style names are normalized).
- Allowed direction: `long`, `short`.
- Allowed outcome: `win`, `loss`, `breakeven`.
- Confidence: `explicit`, `inferred`, `uncertain`, `missing`.
- Required facts: `tradedAt`, `symbol`, `direction`, `riskAmount`, `outcome`, `resultAmount`.
- Use `null` for unknown values and list their names in `missingFields`.
- Required facts marked inferred or uncertain are deliberately saved as a draft.
- `riskAmount` must be greater than zero. For breakeven, `resultAmount` must be zero. For a loss, `resultAmount` must equal `riskAmount`. For a win, it must be a positive absolute amount.
- Do not send signed loss values. The journal changes a loss result to negative P&L.
- Notes may use only paragraphs, line breaks, bold, italic, lists, and links. The app sanitizes them again.
- Screenshot is optional. Supply an absolute local path; the submission script fills `sha256`.
- Create a fresh UUID for each genuinely new request. Reusing an ID is treated as a duplicate.
