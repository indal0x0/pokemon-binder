'use client'

import { useRef, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Upload, ImageOff } from 'lucide-react'
import type { CardRow } from '@/types/electron'

interface Props {
  card: CardRow | null
  onClose: () => void
  onCardUpdated: (card: CardRow) => void
}

export function CardDetailModal({ card, onClose, onCardUpdated }: Props) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const prices = [
    { label: 'Market', value: card.priceMarket },
    { label: 'Low', value: card.priceLow },
    { label: 'Mid', value: card.priceMid },
    { label: 'High', value: card.priceHigh },
  ]

  return (
    <Dialog open={!!card} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-border/60 shadow-2xl bg-card">
        <div className="flex flex-col sm:flex-row">
          {/* Card image */}
          <div className="flex-shrink-0 sm:w-56 bg-background/60 flex items-center justify-center p-4">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={card.name}
                className="w-full aspect-[2.5/3.5] object-contain rounded-md shadow-lg"
              />
            ) : (
              <div
                className={`w-full aspect-[2.5/3.5] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                {uploading ? (
                  <span className="text-xs text-muted-foreground">Uploading...</span>
                ) : (
                  <>
                    <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                    <div className="text-center px-2">
                      <p className="text-xs text-muted-foreground">No image available</p>
                      <p className="text-xs text-primary mt-1 flex items-center gap-1 justify-center">
                        <Upload className="h-3 w-3" /> Upload image
                      </p>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
            )}
          </div>

          {/* Card details */}
          <div className="flex-1 p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold leading-tight">{card.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{card.setName}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Stat label="Collector #" value={card.collectorNumber ? `#${card.collectorNumber}` : '—'} />
              <Stat label="Year" value={card.year ? String(card.year) : '—'} />
              <Stat label="Rarity" value={card.rarity ?? '—'} />
              {card.condition && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Condition</span>
                  <Badge variant="outline" className="w-fit text-xs">{card.condition}</Badge>
                </div>
              )}
            </div>

            <div className="border-t border-border/40 pt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">TCGPlayer Prices</p>
              <div className="grid grid-cols-2 gap-2">
                {prices.map(({ label, value }) => (
                  <div key={label} className={`rounded-lg px-3 py-2 ${label === 'Market' ? 'bg-primary/10 border border-primary/20' : 'bg-background/60'}`}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-sm font-semibold ${label === 'Market' ? 'text-primary' : ''}`}>
                      {value ? formatCurrency(value) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {card.priceUpdatedAt && (
              <p className="text-xs text-muted-foreground/50 mt-auto">
                Prices updated {new Date(card.priceUpdatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
