'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Trash2, ArrowLeftRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { CardRow } from '@/types/electron'

export function BinderCardGrid({
  cards,
  binderId,
  onRefresh,
}: {
  cards: CardRow[]
  binderId: string
  onRefresh: () => void
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function deleteCard(cardId: string) {
    if (!window.electronAPI) return
    setDeletingId(cardId)
    try {
      await window.electronAPI.deleteCard(cardId)
      onRefresh()
    } finally {
      setDeletingId(null)
    }
  }

  async function toggleTradeList(card: CardRow) {
    if (!window.electronAPI) return
    setTogglingId(card.id)
    try {
      await window.electronAPI.updateCard(card.id, { tradeList: !card.tradeList })
      onRefresh()
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {cards.map(card => (
        <div key={card.id} className="group relative bg-card border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
          {card.tradeList ? (
            <div className="absolute top-1.5 left-1.5 z-10">
              <Badge className="text-[10px] px-1 py-0 bg-amber-500 hover:bg-amber-500 text-white border-0">
                Trade
              </Badge>
            </div>
          ) : null}
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.imageUrl} alt={card.name} className="w-full aspect-[2.5/3.5] object-cover" />
          ) : (
            <div className="w-full aspect-[2.5/3.5] bg-secondary flex items-center justify-center">
              <span className="text-xs text-muted-foreground text-center px-2">{card.name}</span>
            </div>
          )}
          <div className="p-2">
            <p className="text-xs font-medium leading-tight truncate">{card.name}</p>
            <p className="text-xs text-muted-foreground truncate">{card.setName}</p>
            {card.collectorNumber && (
              <p className="text-xs text-muted-foreground">#{card.collectorNumber}</p>
            )}
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-sm font-semibold text-primary">
                {card.priceMarket ? formatCurrency(card.priceMarket) : '—'}
              </p>
              <div className="flex gap-1">
                {card.condition && <Badge variant="outline" className="text-xs px-1 py-0">{card.condition}</Badge>}
                {card.quantity > 1 && <Badge variant="secondary" className="text-xs px-1 py-0">x{card.quantity}</Badge>}
              </div>
            </div>
          </div>

          <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => toggleTradeList(card)}
              disabled={togglingId === card.id}
              title={card.tradeList ? 'Remove from trade list' : 'Add to trade list'}
              className="bg-background/80 rounded p-1 hover:bg-amber-500 hover:text-white transition-colors"
            >
              <ArrowLeftRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => deleteCard(card.id)}
              disabled={deletingId === card.id}
              className="bg-background/80 rounded p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
