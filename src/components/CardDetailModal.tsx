'use client'

import { useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { Upload, ImageOff, Loader2 } from 'lucide-react'
import type { CardRow, FullCardPricing } from '@/types/electron'
import { ImageLightbox } from './ImageLightbox'

interface Props {
  card: CardRow | null
  onClose: () => void
  onCardUpdated: (card: CardRow) => void
  readOnly?: boolean
}

const CONDITIONS = [
  { short: 'NM',  label: 'Near Mint',         pct: 1.00 },
  { short: 'LP',  label: 'Lightly Played',     pct: 0.80 },
  { short: 'MP',  label: 'Moderately Played',  pct: 0.60 },
  { short: 'HP',  label: 'Heavily Played',     pct: 0.40 },
  { short: 'DMG', label: 'Damaged',            pct: 0.20 },
]

export function CardDetailModal({ card, onClose, onCardUpdated, readOnly = false }: Props) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pricing, setPricing] = useState<FullCardPricing | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [eurUsdRate, setEurUsdRate] = useState<number | null>(null)
  const [purchasedPriceInput, setPurchasedPriceInput] = useState('')
  const [savingPurchasedPrice, setSavingPurchasedPrice] = useState(false)
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

  useEffect(() => {
    if (card) {
      setPurchasedPriceInput(card.purchasedPrice != null ? String(card.purchasedPrice) : '')
    }
  }, [card?.id])

  // Fetch EUR/USD rate when we have cardmarket data but no USD variants
  useEffect(() => {
    if (!pricing) return
    const hasUsd = pricing.variants && pricing.variants.length > 0
    const hasEur = pricing.cardmarket && (pricing.cardmarket.avg != null || pricing.cardmarket.trend != null)
    if (!hasUsd && hasEur && eurUsdRate === null) {
      window.electronAPI?.getEurUsdRate().then(rate => setEurUsdRate(rate)).catch(() => setEurUsdRate(1.10))
    }
  }, [pricing, eurUsdRate])

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

  async function savePurchasedPrice() {
    if (!window.electronAPI || !card) return
    const val = purchasedPriceInput.trim()
    const parsed = val === '' ? null : parseFloat(val)
    if (parsed !== null && isNaN(parsed)) return
    setSavingPurchasedPrice(true)
    try {
      const updated = await window.electronAPI.updateCard(card.id, { purchasedPrice: parsed })
      onCardUpdated(updated)
    } finally {
      setSavingPurchasedPrice(false)
    }
  }

  const bestMarket = pricing?.bestMarket ?? card.priceMarket
  const hasUsdVariants = pricing?.variants && pricing.variants.length > 0
  const hasCardmarket = !!pricing?.cardmarket

  return (
    <>
    <ImageLightbox src={lightboxOpen ? imageUrl : null} alt={card.name} onClose={() => setLightboxOpen(false)} />
    <Dialog open={!!card} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="!w-[95vw] !max-w-[95vw] h-[88vh] p-0 overflow-hidden border-border/60 shadow-2xl bg-card flex flex-col">

        {/* Top section: image + card identity */}
        <div className="flex gap-8 p-8 border-b border-border/30 flex-shrink-0">

          {/* Card image */}
          <div className="flex-shrink-0 w-44">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={card.name} className="w-full aspect-[2.5/3.5] object-contain rounded-xl shadow-xl cursor-zoom-in" onClick={() => setLightboxOpen(true)} />
            ) : (
              <div
                className={`w-full aspect-[2.5/3.5] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
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
                      <ImageOff className="h-7 w-7 text-muted-foreground/30" />
                      <p className="text-xs text-primary flex items-center gap-1"><Upload className="h-3.5 w-3.5" />Upload</p>
                    </>
                }
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>
            )}
          </div>

          {/* Card identity + market price */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-4">
            <div>
              <h2 className="text-3xl font-bold leading-tight">{card.name}</h2>
              <p className="text-base text-muted-foreground mt-1">{card.setName}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {card.collectorNumber && <Tag>#{card.collectorNumber}</Tag>}
                {card.year && <Tag>{card.year}</Tag>}
                {card.rarity && <Tag>{card.rarity}</Tag>}
                {!readOnly && (
                <select
                  value={card.condition ?? ''}
                  onChange={async e => {
                    const newVal = e.target.value || null
                    await window.electronAPI?.updateCard(card.id, { condition: newVal })
                    onCardUpdated({ ...card, condition: newVal })
                  }}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground"
                >
                  <option value="">— Condition —</option>
                  {CONDITIONS.map(c => (
                    <option key={c.short} value={c.short}>{c.short} – {c.label}</option>
                  ))}
                </select>
                )}
              </div>
            </div>

            {bestMarket != null && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Market Price</p>
                <p className="text-4xl font-bold text-primary">{formatCurrency(bestMarket)}</p>
              </div>
            )}

            {/* Purchase price */}
            {!readOnly && <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Purchase Price</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={purchasedPriceInput}
                  onChange={e => setPurchasedPriceInput(e.target.value)}
                  onBlur={savePurchasedPrice}
                  onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
                  className="w-28 text-sm px-2 py-1 rounded-md border border-border bg-background text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                {savingPurchasedPrice && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                {card.purchasedPrice != null && bestMarket != null && (
                  <span className={`text-xs font-semibold ${bestMarket >= card.purchasedPrice ? 'text-green-500' : 'text-red-400'}`}>
                    {bestMarket >= card.purchasedPrice ? '+' : ''}{formatCurrency(bestMarket - card.purchasedPrice)}
                  </span>
                )}
              </div>
            </div>}
          </div>
        </div>

        {/* Bottom section: pricing */}
        <div className="flex-1 overflow-auto p-8 min-h-0">
          {loadingPrices ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading prices...
            </div>
          ) : (
            <div className="flex gap-8">

              {/* Condition price rows */}
              {bestMarket != null && (
                <div className="flex-1 min-w-[220px]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">By Condition</p>
                  <div className="space-y-1">
                    {CONDITIONS.map(c => (
                      <div key={c.short} className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
                        <div className="flex items-center gap-5">
                          <span className="text-sm font-mono font-bold w-10 text-foreground/80">{c.short}</span>
                          <span className="text-sm text-muted-foreground">{c.label}</span>
                        </div>
                        <span className="text-base font-bold tabular-nums">{formatCurrency(bestMarket * c.pct)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TCGPlayer variants */}
              {hasUsdVariants && (
                <div className="flex-1 min-w-[220px]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">TCGPlayer</p>
                  <div className="space-y-4">
                    {pricing!.variants.map(v => (
                      <div key={v.label}>
                        <p className="text-sm font-semibold text-foreground/80 mb-2">{v.label}</p>
                        <div className="space-y-1">
                          {[
                            { l: 'Low',    val: v.low },
                            { l: 'Market', val: v.market },
                            { l: 'Mid',    val: v.mid },
                            { l: 'High',   val: v.high },
                          ].map(({ l, val }) => (
                            <div key={l} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                              <span className="text-sm text-muted-foreground">{l}</span>
                              <span className={`text-base font-bold tabular-nums ${l === 'Market' ? 'text-primary' : ''}`}>
                                {val ? formatCurrency(val) : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cardmarket */}
              {hasCardmarket && pricing?.cardmarket && (
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
                    Cardmarket <span className="normal-case">(EUR)</span>
                    {!hasUsdVariants && eurUsdRate && (
                      <span className="ml-1 text-muted-foreground/40 normal-case">· ~USD shown</span>
                    )}
                  </p>
                  <div className="space-y-1">
                    {[
                      { label: 'Average', value: pricing.cardmarket.avg },
                      { label: 'Low',     value: pricing.cardmarket.low },
                      { label: 'Trend',   value: pricing.cardmarket.trend },
                      { label: '7-Day',   value: pricing.cardmarket.avg7 },
                      { label: '30-Day',  value: pricing.cardmarket.avg30 },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <div className="text-right">
                          <span className="text-base font-bold tabular-nums">
                            {value != null ? `€${value.toFixed(2)}` : '—'}
                          </span>
                          {!hasUsdVariants && eurUsdRate && value != null && (
                            <p className="text-xs text-muted-foreground/50 tabular-nums">~{formatCurrency(value * eurUsdRate)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!bestMarket && !loadingPrices && (
                <p className="text-sm text-muted-foreground/50">No price data available</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {card.priceUpdatedAt && (
          <div className="px-8 py-3 border-t border-border/20 flex-shrink-0">
            <p className="text-[10px] text-muted-foreground/30">
              Prices as of {new Date(card.priceUpdatedAt).toLocaleDateString()}
            </p>
          </div>
        )}

      </DialogContent>
    </Dialog>
    </>
  )
}

function Tag({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-md ${
      highlight ? 'border border-border text-foreground' : 'bg-secondary text-muted-foreground'
    }`}>
      {children}
    </span>
  )
}
