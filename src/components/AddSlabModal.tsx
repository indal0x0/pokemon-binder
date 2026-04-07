'use client'

import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import type { SlabRow } from '@/types/electron'

const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC'] as const

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (slab: SlabRow) => void
}

export function AddSlabModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('PSA')
  const [customCompany, setCustomCompany] = useState('')
  const [grade, setGrade] = useState('')
  const [certNumber, setCertNumber] = useState('')
  const [pricePaid, setPricePaid] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setName(''); setCompany('PSA'); setCustomCompany(''); setGrade('')
    setCertNumber(''); setPricePaid(''); setCurrentPrice(''); setImageFile(null)
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Card name is required'); return }
    if (!grade.trim()) { toast.error('Grade is required'); return }
    if (!window.electronAPI) return

    const gradingCompany = company === 'Custom' ? customCompany.trim() : company

    setSubmitting(true)
    try {
      let slab = await window.electronAPI.createSlab({
        name: name.trim(),
        gradingCompany,
        grade: grade.trim(),
        certNumber: certNumber.trim() || null,
        pricePaid: pricePaid ? parseFloat(pricePaid) : null,
        currentPrice: currentPrice ? parseFloat(currentPrice) : null,
      })

      if (imageFile) {
        slab = await window.electronAPI.uploadSlabImage(slab.id, imageFile)
      }

      onCreated(slab)
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add slab')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Slab</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="s-name" className="text-xs text-muted-foreground mb-1 block">Card Name <span className="text-destructive">*</span></Label>
            <Input id="s-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Charizard Base Set" className="h-8 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="s-company" className="text-xs text-muted-foreground mb-1 block">Grading Company</Label>
              <select
                id="s-company"
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="w-full h-8 text-sm px-2 rounded-md border border-border bg-background text-foreground"
              >
                {GRADING_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="Custom">Custom...</option>
              </select>
              {company === 'Custom' && (
                <Input value={customCompany} onChange={e => setCustomCompany(e.target.value)} placeholder="Company name" className="h-8 text-sm mt-1" />
              )}
            </div>
            <div>
              <Label htmlFor="s-grade" className="text-xs text-muted-foreground mb-1 block">Grade <span className="text-destructive">*</span></Label>
              <Input id="s-grade" value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. 10" className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <Label htmlFor="s-cert" className="text-xs text-muted-foreground mb-1 block">Cert Number</Label>
            <Input id="s-cert" value={certNumber} onChange={e => setCertNumber(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="s-paid" className="text-xs text-muted-foreground mb-1 block">Price Paid ($)</Label>
              <Input id="s-paid" type="number" min="0" step="0.01" placeholder="0.00" value={pricePaid} onChange={e => setPricePaid(e.target.value)}
                className="h-8 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
            <div>
              <Label htmlFor="s-curr" className="text-xs text-muted-foreground mb-1 block">Current Price ($)</Label>
              <Input id="s-curr" type="number" min="0" step="0.01" placeholder="0.00" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)}
                className="h-8 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Image (optional)</Label>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border/50 rounded-md px-3 py-1.5 transition-colors">
              <Paperclip className="h-3.5 w-3.5" />
              {imageFile ? imageFile.name : 'Choose image...'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setImageFile(f) }} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting || !name.trim() || !grade.trim()}>
              {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Adding...</> : 'Add Slab'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
