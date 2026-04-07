'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, ImageOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CardRow } from '@/types/electron'

const CONDITIONS = [
  { short: 'NM',  label: 'Near Mint' },
  { short: 'LP',  label: 'Lightly Played' },
  { short: 'MP',  label: 'Moderately Played' },
  { short: 'HP',  label: 'Heavily Played' },
  { short: 'DMG', label: 'Damaged' },
]

interface Props {
  binderId: string
  pageId: string
  onAdd: (card: CardRow) => void
}

export function CustomCardForm({ binderId, pageId, onAdd }: Props) {
  const [name, setName] = useState('')
  const [cardSetName, setCardSetName] = useState('')
  const [collectorNumber, setCollectorNumber] = useState('')
  const [condition, setCondition] = useState('')
  const [pricePaid, setPricePaid] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(file: File) {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function resetForm() {
    setName('')
    setCardSetName('')
    setCollectorNumber('')
    setCondition('')
    setPricePaid('')
    setEstimatedValue('')
    setImageFile(null)
    setImagePreview(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Card name is required'); return }
    if (!window.electronAPI) return

    setSubmitting(true)
    try {
      let card = await window.electronAPI.createCard({
        binderId,
        pageId,
        tcgApiId: 'custom',
        name: name.trim(),
        setName: cardSetName.trim() || 'Custom',
        setId: 'custom',
        collectorNumber: collectorNumber.trim() || '',
        rarity: null,
        imageUrl: null,
        priceLow: null,
        priceMid: null,
        priceMarket: estimatedValue ? parseFloat(estimatedValue) : null,
        priceHigh: null,
        quantity: 1,
        condition: condition || null,
        tradeList: 0,
        purchasedPrice: pricePaid ? parseFloat(pricePaid) : null,
        isCustom: 1,
      } as Parameters<typeof window.electronAPI.createCard>[0])

      if (imageFile) {
        card = await window.electronAPI.uploadCardImage(card.id, binderId, imageFile)
      }

      onAdd(card)
      resetForm()
      toast.success('Custom card added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add card')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0 h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Image upload */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Card Image (optional)</Label>
          {imagePreview ? (
            <div className="relative group/img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Preview" className="w-full aspect-[3/4] object-contain rounded-lg border border-border/50" />
              <div
                className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-white text-xs flex items-center gap-1"><Upload className="h-3.5 w-3.5" />Replace</p>
              </div>
            </div>
          ) : (
            <div
              className={`w-full aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                dragOver ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f) }}
            >
              <ImageOff className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-xs text-primary flex items-center gap-1"><Upload className="h-3 w-3" />Upload image</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
        </div>

        {/* Name */}
        <div>
          <Label htmlFor="cc-name" className="text-xs text-muted-foreground mb-1 block">Card Name <span className="text-destructive">*</span></Label>
          <Input id="cc-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Charizard" className="h-8 text-sm" />
        </div>

        {/* Set name */}
        <div>
          <Label htmlFor="cc-set" className="text-xs text-muted-foreground mb-1 block">Set Name</Label>
          <Input id="cc-set" value={cardSetName} onChange={e => setCardSetName(e.target.value)} placeholder="e.g. Base Set" className="h-8 text-sm" />
        </div>

        {/* Card number */}
        <div>
          <Label htmlFor="cc-num" className="text-xs text-muted-foreground mb-1 block">Card Number</Label>
          <Input id="cc-num" value={collectorNumber} onChange={e => setCollectorNumber(e.target.value)} placeholder="e.g. 4/102" className="h-8 text-sm" />
        </div>

        {/* Condition */}
        <div>
          <Label htmlFor="cc-cond" className="text-xs text-muted-foreground mb-1 block">Condition</Label>
          <select
            id="cc-cond"
            value={condition}
            onChange={e => setCondition(e.target.value)}
            className="w-full h-8 text-sm px-2 rounded-md border border-border bg-background text-foreground"
          >
            <option value="">— None —</option>
            {CONDITIONS.map(c => (
              <option key={c.short} value={c.short}>{c.short} – {c.label}</option>
            ))}
          </select>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="cc-paid" className="text-xs text-muted-foreground mb-1 block">Price Paid ($)</Label>
            <Input
              id="cc-paid"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={pricePaid}
              onChange={e => setPricePaid(e.target.value)}
              className="h-8 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <div>
            <Label htmlFor="cc-est" className="text-xs text-muted-foreground mb-1 block">Est. Value ($)</Label>
            <Input
              id="cc-est"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={estimatedValue}
              onChange={e => setEstimatedValue(e.target.value)}
              className="h-8 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t bg-background">
        <Button type="submit" className="w-full" disabled={submitting || !name.trim()}>
          {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Adding...</> : 'Add Custom Card'}
        </Button>
      </div>
    </form>
  )
}
