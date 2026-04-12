'use client'

import { useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { Upload, ImageOff, Loader2 } from 'lucide-react'
import type { CardRow, FullCardPricing } from '@/types/electron'
import { ImageLightbox } from './ImageLightbox'
import * as api from '@/lib/api'

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
  const [opDetails, setOpDetails] = useState<{
    card_effect: string | null; cost: string | null; power: string | null
    attributes: string | null; counter: string | null; card_type: string | null
    abilities: string[]
    priceMarket: number | null; priceLow: number | null
  } | null>(null)
  const [loadingOpDetails, setLoadingOpDetails] = useState(false)
  // Custom card editable fields
  const [nameInput, setNameInput] = useState('')
  const [setNameInput2, setSetNameInput] = useState('')
  const [collectorNumberInput, setCollectorNumberInput] = useState('')
  const [estimatedValueInput, setEstimatedValueInput] = useState('')
  const [savingField, setSavingField] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isCustom = !!card?.isCustom
  const isOnePiece = card?.cardGame === 'onepiece'

  useEffect(() => {
    if (!card || !isOnePiece) { setOpDetails(null); return }
    setLoadingOpDetails(true)
    api.getOpCardDetails(card.tcgApiId, card.name, card.imageUrl ?? undefined)
      .then(d => setOpDetails(d ?? null))
      .catch(() => setOpDetails(null))
      .finally(() => setLoadingOpDetails(false))
  }, [card?.tcgApiId, isOnePiece])

  useEffect(() => {
    if (!card) { setPricing(null); return }
    if (isCustom) return  // Custom cards have no TCG price data
    if (isOnePiece) return  // One Piece cards handled separately above
    if (card.tcgApiId.startsWith('unmatched-')) return
    setLoadingPrices(true)
    setPricing(null)
    api.getCardPrices(card.tcgApiId)
      .then(p => setPricing(p))
      .catch(() => setPricing(null))
      .finally(() => setLoadingPrices(false))
  }, [card?.tcgApiId, isCustom])

  useEffect(() => {
    if (card) {
      setPurchasedPriceInput(card.purchasedPrice != null ? String(card.purchasedPrice) : '')
      if (card.isCustom || card.cardGame === 'onepiece') {
        setNameInput(card.name ?? '')
        setSetNameInput(card.setName ?? '')
        setCollectorNumberInput(card.collectorNumber ?? '')
        setEstimatedValueInput(
          card.priceMarket != null ? String(card.priceMarket) :
          opDetails?.priceMarket != null ? String(opDetails.priceMarket) : ''
        )
      }
    }
  }, [card?.id, opDetails])

  // Fetch EUR/USD rate when we have cardmarket data but no USD variants
  useEffect(() => {
    if (!pricing) return
    const hasUsd = pricing.variants && pricing.variants.length > 0
    const hasEur = pricing.cardmarket && (pricing.cardmarket.avg != null || pricing.cardmarket.trend != null)
    if (!hasUsd && hasEur && eurUsdRate === null) {
      api.getEurUsdRate().then(rate => setEurUsdRate(rate)).catch(() => setEurUsdRate(1.10))
    }
  }, [pricing, eurUsdRate])

  if (!card) return null

  const imageUrl = card.imageUrl
    ? card.imageUrl.startsWith('uploads/')
      ? api.getImageUrl(card.imageUrl) ?? card.imageUrl
      : card.imageUrl
    : null

  async function handleFile(file: File) {
    if (!api || !card) return
    setUploading(true)
    try {
      const updated = await api.uploadCardImage(card.id, card.binderId, file)
      onCardUpdated(updated)
    } finally {
      setUploading(false)
    }
  }

  async function saveCustomField(field: string, value: string | null) {
    if (!api || !card) return
    setSavingField(true)
    try {
      const parsed = field === 'priceMarket' || field === 'purchasedPrice'
        ? (value === '' || value === null ? null : parseFloat(value as string))
        : value
      const updated = await api.updateCard(card.id, { [field]: parsed })
      onCardUpdated(updated)
    } finally {
      setSavingField(false)
    }
  }

  async function savePurchasedPrice() {
    if (!api || !card) return
    const val = purchasedPriceInput.trim()
    const parsed = val === '' ? null : parseFloat(val)
    if (parsed !== null && isNaN(parsed)) return
    setSavingPurchasedPrice(true)
    try {
      const updated = await api.updateCard(card.id, { purchasedPrice: parsed })
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
        <div className="flex gap-8 p-8 flex-shrink-0">

          {/* Card image */}
          <div className="flex-shrink-0 w-44">
            {imageUrl ? (
              <div className="relative group/img w-full aspect-[2.5/3.5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={card.name} className="w-full h-full object-contain rounded-xl shadow-xl cursor-zoom-in" onClick={() => setLightboxOpen(true)} />
                {isCustom && !readOnly && (
                  <div
                    className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <p className="text-white text-xs flex items-center gap-1"><Upload className="h-3.5 w-3.5" />Replace</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  </div>
                )}
              </div>
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
              {isCustom && !readOnly ? (
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onBlur={() => saveCustomField('name', nameInput)}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  className="text-3xl font-bold leading-tight bg-transparent border-b border-border/50 focus:border-primary outline-none w-full mb-1"
                />
              ) : (
                <h2 className="text-3xl font-bold leading-tight">{card.name}</h2>
              )}
              {isCustom && !readOnly ? (
                <input
                  type="text"
                  value={setNameInput2}
                  onChange={e => setSetNameInput(e.target.value)}
                  onBlur={() => saveCustomField('setName', setNameInput2)}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  className="text-base text-muted-foreground mt-1 bg-transparent border-b border-border/30 focus:border-primary outline-none w-full"
                  placeholder="Set name"
                />
              ) : (
                <p className="text-base text-muted-foreground mt-1">{card.setName}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {isCustom ? (
                  !readOnly && (
                    <input
                      type="text"
                      value={collectorNumberInput}
                      onChange={e => setCollectorNumberInput(e.target.value)}
                      onBlur={() => saveCustomField('collectorNumber', collectorNumberInput)}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      className="text-xs px-2 py-1 rounded-md border border-border/50 bg-background text-foreground focus:border-primary outline-none w-28"
                      placeholder="#Number"
                    />
                  )
                ) : (
                  <>
                    {card.collectorNumber && <Tag>#{card.collectorNumber}</Tag>}
                    {card.year && <Tag>{card.year}</Tag>}
                    {card.rarity && <Tag>{card.rarity}</Tag>}
                  </>
                )}
                {isCustom && <Tag highlight>Custom</Tag>}
                {!readOnly && (
                <select
                  value={card.condition ?? ''}
                  onChange={async e => {
                    const newVal = e.target.value || null
                    await api.updateCard(card.id, { condition: newVal })
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

            {(isCustom || isOnePiece) && !readOnly ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">{isOnePiece ? 'Price' : 'Estimated Value'}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={estimatedValueInput}
                    onChange={e => setEstimatedValueInput(e.target.value)}
                    onBlur={() => saveCustomField('priceMarket', estimatedValueInput)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    className="w-28 text-sm px-2 py-1 rounded-md border border-border bg-background text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  {savingField && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
              </div>
            ) : bestMarket != null ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Market Price</p>
                <p className="text-4xl font-bold text-primary">{formatCurrency(bestMarket)}</p>
              </div>
            ) : null}

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
          {isCustom ? (
            <p className="text-sm text-muted-foreground/50">Custom card — no market price data</p>
          ) : isOnePiece ? (
            loadingOpDetails ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading card details...
              </div>
            ) : opDetails ? (
              <div className="space-y-5">
                {/* Price */}
                {(opDetails.priceMarket != null || opDetails.priceLow != null) && (
                  <div className="flex gap-6">
                    {opDetails.priceMarket != null && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Market</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(opDetails.priceMarket)}</p>
                      </div>
                    )}
                    {opDetails.priceLow != null && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Low</p>
                        <p className="text-lg font-semibold text-foreground/70">{formatCurrency(opDetails.priceLow)}</p>
                      </div>
                    )}
                  </div>
                )}
                {/* Stats row */}
                {(opDetails.card_type || opDetails.cost || opDetails.power || opDetails.attributes || opDetails.counter) && (
                  <div className="flex flex-wrap gap-4">
                    {opDetails.card_type && (
                      <div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Type</p><p className="text-sm font-semibold">{opDetails.card_type}</p></div>
                    )}
                    {opDetails.cost && (
                      <div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Cost</p><p className="text-sm font-semibold">{opDetails.cost}</p></div>
                    )}
                    {opDetails.power && (
                      <div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Power</p><p className="text-sm font-semibold">{opDetails.power}</p></div>
                    )}
                    {opDetails.attributes && (
                      <div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Attribute</p><p className="text-sm font-semibold">{opDetails.attributes}</p></div>
                    )}
                    {opDetails.counter && opDetails.counter !== '-' && (
                      <div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Counter</p><p className="text-sm font-semibold">{opDetails.counter}</p></div>
                    )}
                  </div>
                )}
                {/* Card effect text */}
                {opDetails.card_effect && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">Card Effect</p>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{opDetails.card_effect}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50">No card details available</p>
            )
          ) : loadingPrices ? (
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
                      <div key={c.short} className="flex items-center justify-between py-3">
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
                            <div key={l} className="flex items-center justify-between py-1.5">
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
                      <div key={label} className="flex items-center justify-between py-3">
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
          <div className="px-8 py-3 flex-shrink-0">
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
