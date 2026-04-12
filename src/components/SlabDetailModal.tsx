'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Award, ImageOff, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { ImageLightbox } from './ImageLightbox'
import type { SlabRow } from '@/types/electron'
import * as api from '@/lib/api'

const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC']

interface Props {
  slab: SlabRow | null
  onClose: () => void
  onUpdated: (slab: SlabRow) => void
  onDeleted: (id: string) => void
}

export function SlabDetailModal({ slab, onClose, onUpdated, onDeleted }: Props) {
  const [nameInput, setNameInput] = useState('')
  const [companyInput, setCompanyInput] = useState('')
  const [gradeInput, setGradeInput] = useState('')
  const [certInput, setCertInput] = useState('')
  const [pricePaidInput, setPricePaidInput] = useState('')
  const [currentPriceInput, setCurrentPriceInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!slab) return
    setNameInput(slab.name ?? '')
    setCompanyInput(slab.gradingCompany ?? '')
    setGradeInput(slab.grade ?? '')
    setCertInput(slab.certNumber ?? '')
    setPricePaidInput(slab.pricePaid != null ? String(slab.pricePaid) : '')
    setCurrentPriceInput(slab.currentPrice != null ? String(slab.currentPrice) : '')
  }, [slab?.id])

  if (!slab) return null

  const imageUrl = slab.imageUrl
    ? slab.imageUrl.startsWith('uploads/')
      ? api.getImageUrl(slab.imageUrl) ?? null
      : slab.imageUrl
    : null

  async function saveField(field: keyof SlabRow, value: string) {
    if (!api) return
    let parsed: string | number | null = value.trim() || null
    if (field === 'pricePaid' || field === 'currentPrice') {
      parsed = value.trim() ? parseFloat(value) : null
    }
    try {
      const updated = await api.updateSlab(slab!.id, { [field]: parsed } as Parameters<typeof api.updateSlab>[1])
      onUpdated(updated)
    } catch { toast.error('Failed to save') }
  }

  async function handleFile(file: File) {
    if (!api) return
    setUploading(true)
    try {
      const updated = await api.uploadSlabImage(slab!.id, file)
      onUpdated(updated)
    } catch { toast.error('Failed to upload image') }
    finally { setUploading(false) }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this slab?')) return
    if (!api) return
    setDeleting(true)
    try {
      await api.deleteSlab(slab!.id)
      onDeleted(slab!.id)
      onClose()
    } catch { toast.error('Failed to delete'); setDeleting(false) }
  }

  const fieldClass = "w-full bg-transparent border-b border-border/40 focus:border-primary outline-none text-sm py-0.5"

  return (
    <>
      <ImageLightbox src={lightboxOpen ? imageUrl : null} alt={slab.name} onClose={() => setLightboxOpen(false)} />
      <Dialog open={!!slab} onOpenChange={open => { if (!open) onClose() }}>
        <DialogContent className="!w-[95vw] !max-w-[95vw] h-[88vh] p-0 overflow-hidden border-border/60 shadow-2xl bg-card flex flex-col">
          <div className="flex gap-8 p-8 h-full min-h-0">

            {/* Left: image */}
            <div className="flex-shrink-0 w-52">
              {imageUrl ? (
                <div className="relative group/img w-full aspect-[3/4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={slab.name} className="w-full h-full object-cover rounded-xl shadow-xl cursor-zoom-in" onClick={() => setLightboxOpen(true)} />
                  <div
                    className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading
                      ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                      : <p className="text-white text-xs flex items-center gap-1"><Upload className="h-3.5 w-3.5" />Replace</p>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                </div>
              ) : (
                <div
                  className={`w-full aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
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
                        <Award className="h-8 w-8 text-muted-foreground/20" />
                        <p className="text-xs text-primary flex items-center gap-1"><Upload className="h-3 w-3" />Upload</p>
                      </>}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                </div>
              )}
            </div>

            {/* Right: editable fields */}
            <div className="flex-1 min-w-0 flex flex-col gap-5 overflow-auto">
              {/* Name */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Card Name</p>
                <input
                  className="text-3xl font-bold bg-transparent border-b border-border/40 focus:border-primary outline-none w-full"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onBlur={() => saveField('name', nameInput)}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                />
              </div>

              {/* Company + Grade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Grading Company</p>
                  <select
                    value={GRADING_COMPANIES.includes(companyInput) ? companyInput : 'Custom'}
                    onChange={e => {
                      if (e.target.value !== 'Custom') {
                        setCompanyInput(e.target.value)
                        saveField('gradingCompany', e.target.value)
                      }
                    }}
                    className="w-full h-8 text-sm px-2 rounded-md border border-border bg-background text-foreground mb-1"
                  >
                    {GRADING_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Custom">Custom</option>
                  </select>
                  {!GRADING_COMPANIES.includes(companyInput) && (
                    <input
                      className={fieldClass}
                      value={companyInput}
                      onChange={e => setCompanyInput(e.target.value)}
                      onBlur={() => saveField('gradingCompany', companyInput)}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      placeholder="Company name"
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Grade</p>
                  <input
                    className="text-2xl font-bold bg-transparent border-b border-border/40 focus:border-primary outline-none w-full"
                    value={gradeInput}
                    onChange={e => setGradeInput(e.target.value)}
                    onBlur={() => saveField('grade', gradeInput)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    placeholder="10"
                  />
                </div>
              </div>

              {/* Cert number */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Cert Number</p>
                <input className={fieldClass} value={certInput} placeholder="—"
                  onChange={e => setCertInput(e.target.value)}
                  onBlur={() => saveField('certNumber', certInput)}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Price Paid</p>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      className="flex-1 bg-transparent border-b border-border/40 focus:border-primary outline-none text-xl font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={pricePaidInput}
                      onChange={e => setPricePaidInput(e.target.value)}
                      onBlur={() => saveField('pricePaid', pricePaidInput)}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Current Price</p>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      className="flex-1 bg-transparent border-b border-border/40 focus:border-primary outline-none text-xl font-bold text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={currentPriceInput}
                      onChange={e => setCurrentPriceInput(e.target.value)}
                      onBlur={() => saveField('currentPrice', currentPriceInput)}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    />
                  </div>
                  {slab.pricePaid != null && slab.currentPrice != null && (
                    <p className={`text-xs font-semibold mt-1 ${slab.currentPrice >= slab.pricePaid ? 'text-green-500' : 'text-red-400'}`}>
                      {slab.currentPrice >= slab.pricePaid ? '+' : ''}{formatCurrency(slab.currentPrice - slab.pricePaid)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-border/20">
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete Slab</>}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
