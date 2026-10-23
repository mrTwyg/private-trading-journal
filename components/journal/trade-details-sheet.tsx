/* eslint-disable @next/next/no-img-element */

import { format, parseISO } from "date-fns"
import { ArrowDownRight, ArrowUpRight, Copy, Maximize2, Pencil, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { Trade } from "@/lib/types"
import { formatMoney, formatR } from "@/lib/trading"
import { DetailMetric, OutcomeBadge, accountColors } from "@/components/journal/shared"

export function TradeDetailsSheet({
  trade,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onZoom,
}: {
  trade: Trade | null
  onClose: () => void
  onEdit: (trade: Trade) => void
  onDuplicate: (trade: Trade) => void
  onDelete: (trade: Trade) => void
  onZoom: (url: string | null) => void
}) {
  return (
    <Sheet open={Boolean(trade)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-[var(--border-strong)] bg-[var(--surface-1)] sm:max-w-xl">
        {trade && (
          <>
            <SheetHeader>
              <div className="flex items-start gap-3 pr-8">
                <div
                  className={cn(
                    "trade-direction size-11",
                    trade.direction === "long" ? "text-[var(--success)]" : "text-[var(--loss)]",
                  )}
                >
                  {trade.direction === "long" ? <ArrowUpRight /> : <ArrowDownRight />}
                </div>
                <div>
                  <SheetTitle className="text-xl">{trade.symbol}</SheetTitle>
                  <SheetDescription className="mt-1 capitalize">
                    {trade.direction} · {format(parseISO(trade.tradedAt), "d MMMM yyyy, HH:mm")}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="space-y-6 border-t border-border p-5">
              <div className="grid grid-cols-3 gap-3">
                <DetailMetric label="Outcome">
                  <OutcomeBadge outcome={trade.outcome} />
                </DetailMetric>
                <DetailMetric label="Net P&L">
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      trade.pnlAmount > 0 && "text-[var(--success)]",
                      trade.pnlAmount < 0 && "text-[var(--loss)]",
                    )}
                  >
                    {formatMoney(trade.pnlAmount, trade.currency)}
                  </span>
                </DetailMetric>
                <DetailMetric label="R-multiple">
                  <span className="font-mono font-semibold">{formatR(trade.rMultiple)}</span>
                </DetailMetric>
              </div>
              <div className="grid grid-cols-3 gap-4 border-y border-border py-4">
                <div>
                  <p className="detail-label">Account</p>
                  <p className="mt-1 flex items-center gap-2">
                    <span
                      className="status-pip"
                      style={{ background: accountColors[trade.accountColor] }}
                    />
                    {trade.accountName}
                  </p>
                </div>
                <div>
                  <p className="detail-label">Risked</p>
                  <p className="mt-1 font-mono">{formatMoney(trade.riskAmount, trade.currency)}</p>
                </div>
                <div>
                  <p className="detail-label">Setup</p>
                  <p className="mt-1">{trade.setupName ?? "No setup"}</p>
                </div>
              </div>
              {trade.setupDescription && (
                <div>
                  <p className="detail-label mb-2">Setup description</p>
                  <p className="rounded-lg border border-border bg-[var(--surface-2)] p-3 text-sm leading-6">
                    {trade.setupDescription}
                  </p>
                </div>
              )}
              {trade.tags.length > 0 && (
                <div>
                  <p className="detail-label mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {trade.tags.map((tag) => (
                      <Badge variant="outline" key={tag.id}>
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="detail-label mb-2">Thought process</p>
                <div
                  className="prose-note"
                  dangerouslySetInnerHTML={{ __html: trade.noteHtml || "<p>No notes added.</p>" }}
                />
              </div>
              {trade.image?.url && (
                <div>
                  <p className="detail-label mb-2">Screenshot</p>
                  <button
                    type="button"
                    className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onZoom(trade.image?.url ?? null)}
                    aria-label="Enlarge trade screenshot"
                  >
                    <img
                      src={trade.image.url}
                      alt={`Chart attached to ${trade.symbol} trade`}
                      className="w-full transition group-hover:opacity-80"
                    />
                    <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-md bg-black/75 px-3 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Maximize2 className="size-4" /> Enlarge
                    </span>
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-border pt-5">
                <Button variant="outline" onClick={() => onEdit(trade)}>
                  <Pencil /> Edit
                </Button>
                <Button variant="outline" onClick={() => void onDuplicate(trade)}>
                  <Copy /> Copy to accounts
                </Button>
                <Button
                  variant="ghost"
                  className="ml-auto text-[var(--loss)] hover:bg-[var(--loss-soft)] hover:text-[var(--loss)]"
                  onClick={() => onDelete(trade)}
                >
                  <Trash2 /> Delete
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function TradeImageDialog({
  zoomedImage,
  onClose,
}: {
  zoomedImage: string | null
  onClose: () => void
}) {
  return (
    <Dialog open={Boolean(zoomedImage)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-fit max-w-[95vw] border-0 bg-black p-2" showCloseButton>
        <DialogHeader className="sr-only">
          <DialogTitle>Trade screenshot</DialogTitle>
          <DialogDescription>Enlarged trade chart image</DialogDescription>
        </DialogHeader>
        {zoomedImage && (
          <img
            src={zoomedImage}
            alt="Enlarged trade chart"
            className="max-h-[88vh] max-w-[90vw] object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export function DeleteTradeDialog({
  trade,
  onClose,
  onDelete,
}: {
  trade: Trade | null
  onClose: () => void
  onDelete: (trade: Trade) => Promise<void>
}) {
  return (
    <AlertDialog open={Boolean(trade)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this trade?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the trade, its notes, tags, and screenshot. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep trade</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => trade && onDelete(trade)}>
            Delete trade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
