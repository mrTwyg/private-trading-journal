import { format, parseISO } from "date-fns"
import { Inbox, Pencil, Sparkles, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { TradeDraft as CodexDraft } from "@/lib/types"

export function InboxView({
  drafts,
  onReview,
  onDelete,
}: {
  drafts: CodexDraft[]
  onReview: (draft: CodexDraft) => void
  onDelete: (draft: CodexDraft) => Promise<void>
}) {
  if (!drafts.length)
    return (
      <section className="panel">
        <div className="empty-state">
          <Inbox />
          <h3>Your Codex inbox is clear</h3>
          <p>
            Complete voice and screenshot imports are added automatically. Anything uncertain waits
            here.
          </p>
        </div>
      </section>
    )
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan-soft)] px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Drafts never affect your totals.</strong> Review the
        missing facts before adding one to the journal.
      </div>
      {drafts.map((draft) => {
        const needs = [...new Set([...draft.missingFields, ...draft.uncertainFields])]
        return (
          <section key={draft.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="trade-direction text-[var(--accent-cyan)]">
                    <Sparkles />
                  </span>
                  <div>
                    <h2 className="font-semibold">
                      {draft.symbol || "Instrument missing"}
                      {draft.direction ? ` · ${draft.direction}` : ""}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Received {format(parseISO(draft.createdAt), "d MMM, HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onReview(draft)}>
                  <Pencil /> Review draft
                </Button>
                <Button
                  variant="ghost"
                  className="text-[var(--loss)]"
                  onClick={() => void onDelete(draft)}
                  aria-label="Delete draft"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            {draft.setupDescription && (
              <p className="mt-4 rounded-lg border border-border bg-[var(--surface-2)] px-3 py-2 text-sm">
                {draft.setupDescription}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {needs.map((field) => (
                <Badge
                  key={field}
                  variant="outline"
                  className="border-amber-400/45 bg-amber-400/10 text-foreground"
                >
                  Needs {field}
                </Badge>
              ))}
              {draft.warnings.map((warning) => (
                <Badge key={warning} variant="outline">
                  {warning}
                </Badge>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
