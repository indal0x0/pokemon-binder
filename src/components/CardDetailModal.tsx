'use client'

import { useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Upload, ImageOff, Loader2 } from 'lucide-react'
import type { CardRow, FullCardPricing } from '@/types/electron'

interface Props {
  card: CardRow | null
  onClose: () => void
  onCardUpdated: (card: CardRow) => void
}

const CONDITIONS = [
  { label: 'Near Mint',    short: 'NM',  pct: 1.00 },
  { label: 'Lightly Played', short: 'LP', pct: 0.80 },
  { label: 'Moderately Played', short: 'MP', pct: 0.60 },
  { label: 'Heavily Played', short: 'HP', pct: 0.40 },
  { label: 'Damaged',      short: 'DMG', pct: 0.20 },
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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const bestMarket = pricing?.bestMarket ?? card.priceMarket

  return (
    <Dialog open={!!card} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-border/60 shadow-2xl bg-card gap-0">
        <div className="flex flex-col sm:flex-row min-h-0">

          {/* Left: card image */}
          <div className="flex-shrink-0 sm:w-52 bg-background/50 flex items-center justify-center p-5">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={card.name}
                className="w-full aspect-[2.5/3.5] object-contain rounded-lg shadow-xl"
              />
            ) : (
              <div
                className={`w-full aspect-[2.5/3.5] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImageOff className="h-7 w-7 text-muted-foreground/40" />
                    <div className="text-center px-2">
                      <p className="text-xs text-muted-foreground leading-tight">No image</p>
                      <p className="text-xs text-primary mt-1 flex items-center gap-1 justify-center">
                        <Upload className="h-3 w-3" /> Upload
                      </p>
                    </div>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </div>
            )}
          </div>

          {/* Right: details + pricing */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Card identity */}
            <div className="px-5 pt-5 pb-3 border-b border-border/40">
              <h2 className="text-lg font-bold leading-tight">{card.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{card.setName}</p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {card.collectorNumber && (
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-md text-muted-foreground">#{card.collectorNumber}</span>
                )}
                {card.year && (
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-md text-muted-foreground">{card.year}</span>
                )}
                {card.rarity && (
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-md text-muted-foreground">{card.rarity}</span>
                )}
                {card.condition && (
                  <Badge variant="outline" className="text-xs">{card.condition}</Badge>
                )}
              </div>
            </div>

            {/* Pricing tabs */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loadingPrices ? (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading prices...
                </div>
              ) : (
                <Tabs defaultValue="condition">
                  <TabsList className="h-8 mb-3">
                    <TabsTrigger value="condition" className="text-xs h-7">By Condition</TabsTrigger>
                    <TabsTrigger value="variants" className="text-xs h-7">TCGPlayer</TabsTrigger>
                    <TabsTrigger value="cardmarket" className="text-xs h-7">Cardmarket</TabsTrigger>
                  </TabsList>

                  {/* Condition estimates */}
                  <TabsContent value="condition" className="mt-0">
                    {bestMarket ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">
                          Estimated from {formatCurrency(bestMarket)} market price
                        </p>
                        {CONDITIONS.map(c => (
                          <div key={c.short} className="flex items-center justify-between rounded-lg px-3 py-2 bg-background/60 hover:bg-background/80 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground w-9">{c.short}</span>
                              <span className="text-xs text-muted-foreground">{c.label}</span>
                            </div>
                            <span className="text-sm font-semibold tabular-nums">{formatCurrency(bestMarket * c.pct)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-4">No price data available</p>
                    )}
                  </TabsContent>

                  {/* TCGPlayer variants */}
                  <TabsContent value="variants" className="mt-0">
                    {pricing?.variants && pricing.variants.length > 0 ? (
                      <div className="space-y-2">
                        {pricing.variants.map(v => (
                          <div key={v.label} className="rounded-lg bg-background/60 px-3 py-2.5">
                            <p className="text-xs font-semibold mb-2">{v.label}</p>
                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { label: 'Low', value: v.low },
                                { label: 'Mid', value: v.mid },
                                { label: 'Market', value: v.market },
                                { label: 'High', value: v.high },
                              ].map(({ label, value }) => (
                                <div key={label} className={`text-center rounded p-1.5 ${label === 'Market' ? 'bg-primary/10' : ''}`}>
                                  <p className="text-[10px] text-muted-foreground">{label}</p>
                                  <p className={`text-xs font-semibold tabular-nums ${label === 'Market' ? 'text-primary' : ''}`}>
                                    {value ? formatCurrency(value) : '—'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-4">No TCGPlayer data available</p>
                    )}
                  </TabsContent>

                  {/* Cardmarket */}
                  <TabsContent value="cardmarket" className="mt-0">
                    {pricing?.cardmarket ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">Prices in EUR</p>
                        {[
                          { label: 'Average', value: pricing.cardmarket.avg },
                          { label: 'Low', value: pricing.cardmarket.low },
                          { label: 'Trend', value: pricing.cardmarket.trend },
                          { label: '7-Day Avg', value: pricing.cardmarket.avg7 },
                          { label: '30-Day Avg', value: pricing.cardmarket.avg30 },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between rounded-lg px-3 py-2 bg-background/60">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className="text-sm font-semibold tabular-nums">
                              {value != null ? `€${value.toFixed(2)}` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-4">No Cardmarket data available</p>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>

            {card.priceUpdatedAt && (
              <div className="px-5 pb-3 pt-1">
                <p className="text-[10px] text-muted-foreground/40">
                  Prices as of {new Date(card.priceUpdatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
