'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Trash2, ArrowLeftRight, EyeOff } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { CardRow, FullCardPricing } from '@/types/electron'
import { CardDetailModal } from './CardDetailModal'

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
  const [hideUnpriced, setHideUnpriced] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardRow | null>(null)
  const [livePrices, setLivePrices] = useState<Record<string, FullCardPricing | null>>({})
  const [eurUsdRate, setEurUsdRate] = useState<number | null>(null)

  useEffect(() => {
    const unpriced = cards.filter(c => c.priceMarket == null && !c.tcgApiId.startsWith('unmatched-'))
    if (!unpriced.length || !window.electronAPI) return
    window.electronAPI.getEurUsdRate().then(setEurUsdRate).catch(() => setEurUsdRate(1.10))
    const timeouts: ReturnType<typeof setTimeout>[] = []
    unpriced.forEach((card, i) => {
      const t = setTimeout(async () => {
        try {
          const batch = await window.electronAPI!.getCardPricesBatch([card.tcgApiId])
          setLivePrices(prev => ({ ...prev, [card.tcgApiId]: batch[card.tcgApiId] ?? null }))
        } catch { /* leave as null */ }
      }, i * 100)
      timeouts.push(t)
    })
    return () => timeouts.forEach(clearTimeout)
  }, [cards])

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

  function handleCardUpdated(updated: CardRow) {
    setSelectedCard(updated)
    onRefresh()
  }

  const visible = hideUnpriced
    ? cards.filter(c => c.priceMarket && c.priceMarket > 0)
    : cards

  const hiddenCount = cards.length - visible.length

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {visible.length} card{visible.length !== 1 ? 's' : ''}
          {hideUnpriced && hiddenCount > 0 && (
            <span className="ml-1 text-muted-foreground/60">({hiddenCount} hidden)</span>
          )}
        </p>
        <button
          onClick={() => setHideUnpriced(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
            hideUnpriced
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <EyeOff className="h-3 w-3" />
          Hide unpriced
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {visible.map(card => (
          <div
            key={card.id}
            className="group relative bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-black/30 transition-all duration-200 shadow-md shadow-black/20"
          >
            {card.tradeList ? (
              <div className="absolute top-2 left-2 z-10">
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-500 text-white border-0 shadow-sm">
                  Trade
                </Badge>
              </div>
            ) : null}

            {/* Card image — clickable to open detail */}
            <div
              className="cursor-pointer"
              onClick={() => setSelectedCard(card)}
            >
              {card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    card.imageUrl.startsWith('uploads/')
                      ? window.electronAPI?.getImageUrl(card.imageUrl) ?? card.imageUrl
                      : card.imageUrl
                  }
                  alt={card.name}
                  className="w-full aspect-[2.5/3.5] object-cover"
                />
              ) : (
                <div
                  className="w-full aspect-[2.5/3.5] bg-secondary/60 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                  title="Click to add image"
                >
                  <span className="text-xs text-muted-foreground text-center px-2 leading-tight">{card.name}</span>
                </div>
              )}
            </div>

            <div className="p-2.5">
              <p className="text-xs font-semibold leading-tight truncate">{card.name}</p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{card.setName}</p>
              {card.collectorNumber && (
                <p className="text-[11px] text-muted-foreground/60">#{card.collectorNumber}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-bold text-primary">
                  {card.priceMarket
                    ? formatCurrency(card.priceMarket)
                    : (() => {
                        const live = livePrices[card.tcgApiId]
                        const eur = live?.cardmarket?.trend ?? live?.bestMarket ?? null
                        if (eur != null && eurUsdRate) {
                          return <>~{formatCurrency(eur * eurUsdRate)}</>
                        }
                        return <span className="text-muted-foreground/50 text-xs font-normal">No price</span>
                      })()
                  }
                </p>
                <div className="flex gap-1">
                  {card.quantity > 1 && <Badge variant="secondary" className="text-[10px] px-1 py-0">×{card.quantity}</Badge>}
                </div>
              </div>
              <select
                value={card.condition ?? ''}
                onChange={async e => {
                  const newVal = e.target.value || null
                  await window.electronAPI?.updateCard(card.id, { condition: newVal })
                  onRefresh()
                }}
                onClick={e => e.stopPropagation()}
                className="w-full mt-1 text-[10px] px-1 py-0.5 rounded border border-border bg-background text-foreground"
              >
                <option value="">— Condition —</option>
                <option value="NM">NM</option>
                <option value="LP">LP</option>
                <option value="MP">MP</option>
                <option value="HP">HP</option>
                <option value="DMG">DMG</option>
              </select>
            </div>

            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => toggleTradeList(card)}
                disabled={togglingId === card.id}
                title={card.tradeList ? 'Remove from trade list' : 'Add to trade list'}
                className="bg-background/90 backdrop-blur-sm rounded-md p-1.5 hover:bg-amber-500 hover:text-white transition-colors shadow-sm"
              >
                <ArrowLeftRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => deleteCard(card.id)}
                disabled={deletingId === card.id}
                className="bg-background/90 backdrop-blur-sm rounded-md p-1.5 hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onCardUpdated={handleCardUpdated}
      />
    </>
  )
}
