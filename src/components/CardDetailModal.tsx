'use client'

import { useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { Upload, ImageOff, Loader2 } from 'lucide-react'
import type { CardRow, FullCardPricing } from '@/types/electron'

interface Props {
  card: CardRow | null
  onClose: () => void
  onCardUpdated: (card: CardRow) => void
}

const CONDITIONS = [
  { short: 'NM',  label: 'Near Mint',         pct: 1.00 },
  { short: 'LP',  label: 'Lightly Played',     pct: 0.80 },
  { short: 'MP',  label: 'Moderately Played',  pct: 0.60 },
  { short: 'HP',  label: 'Heavily Played',     pct: 0.40 },
  { short: 'DMG', label: 'Damaged',            pct: 0.20 },
]

export function CardDetailModal({ card, onClose, onCardUpdated }: Props) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pricing, setPricing] = useState<FullCardPricing | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!card) { setPricing(null); return }
    if (card.tcgApiId.startsWith('unmatched-')) return
    setLoadingPrices(true)
    setPricing(null)
    window.electronAPI?.getCardPrices(card.tcgApiId)
      .then(p => setPricing(p))
      .catch(() => setPricing(null))
      .finally(() => setLoadingPrices(false))
  }, [card?.tcgApiId])

  if (!card) return null

  const imageUrl = card.imageUrl
    ? card.imageUrl.startsWith('uploads/')
      ? window.electronAPI?.getImageUrl(card.imageUrl) ?? card.imageUrl
      : card.imageUrl
    : null

  async function handleFile(file: File) {
    if (!window.electronAPI || !card) return
    setUploading(true)
    try {
      const updated = await window.electronAPI.uploadCardImage(card.id, card.binderId, file)
      onCardUpdated(updated)
    } finally {
      setUploading(false)
    }
  }

  const bestMarket = pricing?.bestMarket ?? card.priceMarket

  return (
    <Dialog open={!!card} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-border/60 shadow-2xl bg-card">
        <div className="flex">

          {/* Left: card image */}
          <div className="flex-shrink-0 w-44 bg-background/50 flex items-center justify-center p-4">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={card.name} className="w-full aspect-[2.5/3.5] object-contain rounded-lg shadow-lg" />
            ) : (
              <div
                className={`w-full aspect-[2.5/3.5] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
              >
                {uploading
                  ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  : <>
                      <ImageOff className="h-6 w-6 text-muted-foreground/30" />
                      <p className="text-[10px] text-primary flex items-center gap-1"><Upload className="h-3 w-3" />Upload</p>
                    </>
                }
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>
            )}
          </div>

          {/* Right: info + pricing */}
          <div className="flex-1 min-w-0 flex flex-col p-4 gap-3">

            {/* Card identity */}
            <div>
              <h2 className="text-base font-bold leading-tight">{card.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{card.setName}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {card.collectorNumber && <Tag>#{card.collectorNumber}</Tag>}
                {card.year && <Tag>{card.year}</Tag>}
                {card.rarity && <Tag>{card.rarity}</Tag>}
                {card.condition && <Tag highlight>{card.condition}</Tag>}
              </div>
            </div>

            {/* Pricing — three columns */}
            {loadingPrices ? (
              <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading prices...
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 flex-1">

                {/* By Condition */}
                <div className="bg-background/50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">By Condition</p>
                  {bestMarket ? (
                    <div className="space-y-1">
                      {CONDITIONS.map(c => (
                        <div key={c.short} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-muted-foreground w-7">{c.short}</span>
                            <span className="text-[10px] text-muted-foreground/70 hidden xl:block">{c.label}</span>
                          </div>
                          <span className="text-xs font-semibold tabular-nums">{formatCurrency(bestMarket * c.pct)}</span>
                        </div>
                      ))}
                      <p className="text-[9px] text-muted-foreground/40 mt-1.5">Est. from {formatCurrency(bestMarket)} NM</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50">No data</p>
                  )}
                </div>

                {/* TCGPlayer variants */}
                <div className="bg-background/50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">TCGPlayer</p>
                  {pricing?.variants && pricing.variants.length > 0 ? (
                    <div className="space-y-2">
                      {pricing.variants.map(v => (
                        <div key={v.label}>
                          <p className="text-[10px] text-muted-foreground/60 mb-0.5">{v.label}</p>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                            {[
                              { l: 'Low', val: v.low },
                              { l: 'Market', val: v.market },
                              { l: 'Mid', val: v.mid },
                              { l: 'High', val: v.high },
                            ].map(({ l, val }) => (
                              <div key={l} className="flex items-center justify-between">
                                <span className="text-[9px] text-muted-foreground/50">{l}</span>
                                <span className={`text-[10px] font-semibold tabular-nums ${l === 'Market' ? 'text-primary' : ''}`}>
                                  {val ? formatCurrency(val) : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50">No data</p>
                  )}
                </div>

                {/* Cardmarket */}
                <div className="bg-background/50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Cardmarket <span className="normal-case">(EUR)</span></p>
                  {pricing?.cardmarket ? (
                    <div className="space-y-1">
                      {[
                        { label: 'Average',  value: pricing.cardmarket.avg },
                        { label: 'Low',      value: pricing.cardmarket.low },
                        { label: 'Trend',    value: pricing.cardmarket.trend },
                        { label: '7-Day',    value: pricing.cardmarket.avg7 },
                        { label: '30-Day',   value: pricing.cardmarket.avg30 },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground/70">{label}</span>
                          <span className="text-xs font-semibold tabular-nums">
                            {value != null ? `€${value.toFixed(2)}` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50">No data</p>
                  )}
                </div>

              </div>
            )}

            {card.priceUpdatedAt && (
              <p className="text-[9px] text-muted-foreground/30">
                Prices as of {new Date(card.priceUpdatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Tag({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
      highlight ? 'border border-border text-foreground' : 'bg-secondary text-muted-foreground'
    }`}>
      {children}
    </span>
  )
}
