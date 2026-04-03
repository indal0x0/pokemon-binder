'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ArrowLeft, ImageIcon, Palette, Pencil } from 'lucide-react'
import { BinderCardGrid } from '@/components/BinderCardGrid'
import { BinderActions } from '@/components/BinderActions'
import { BinderCover } from '@/components/BinderCover'
import { PagesGallery } from '@/components/PagesGallery'
import { formatCurrency } from '@/lib/utils'
import type { BinderRow, PageRow, CardRow } from '@/types/electron'

type FullBinder = BinderRow & { pages: PageRow[]; cards: CardRow[] }
type CoverMode = 'color' | 'image'

export default function BinderPage() {
  const router = useRouter()
  const [binder, setBinder] = useState<FullBinder | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit cover dialog
  const [coverOpen, setCoverOpen] = useState(false)
  const [coverMode, setCoverMode] = useState<CoverMode>('color')
  const [coverColor, setCoverColor] = useState('#3b82f6')
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [coverSaving, setCoverSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const binderId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('id') ?? ''
    : ''

  const load = useCallback(async () => {
    if (!binderId || !window.electronAPI) { setLoading(false); return }
    try {
      const data = await window.electronAPI.getBinder(binderId)
      if (!data) { router.push('/'); return }
      setBinder(data)
      setLoading(false)
    } catch { setLoading(false) }
  }, [binderId, router])

  useEffect(() => { load() }, [load])

  function openEditCover() {
    if (!binder) return
    if (binder.coverImagePath) {
      setCoverMode('image')
      setCoverImagePreview(window.electronAPI?.getImageUrl(binder.coverImagePath) ?? null)
      setCoverImageFile(null)
    } else {
      setCoverMode('color')
      setCoverColor(binder.coverColor || '#3b82f6')
      setCoverImagePreview(null)
      setCoverImageFile(null)
    }
    setCoverOpen(true)
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverImageFile(file)
    setCoverImagePreview(URL.createObjectURL(file))
  }

  async function saveCover() {
    if (!binder || !window.electronAPI) return
    setCoverSaving(true)
    try {
      if (coverMode === 'color') {
        await window.electronAPI.updateBinder(binder.id, { coverColor, coverImagePath: null })
      } else if (coverImageFile) {
        const path = await window.electronAPI.uploadCover(binder.id, coverImageFile)
        await window.electronAPI.updateBinder(binder.id, { coverImagePath: path, coverColor: null })
      }
      await load()
      setCoverOpen(false)
    } finally {
      setCoverSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
  if (!binder) return null

  const totalValue = binder.cards.reduce((sum, c) => sum + (c.priceMarket || 0) * c.quantity, 0)
  const cardCount = binder.cards.reduce((sum, c) => sum + c.quantity, 0)

  const editPreviewBinder = {
    coverColor: coverMode === 'color' ? coverColor : null,
    coverImagePath: coverMode === 'image' && !coverImageFile ? (binder.coverImagePath ?? null) : null,
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {/* Cover thumbnail */}
        <div className="relative group flex-shrink-0 cursor-pointer" onClick={openEditCover}>
          <BinderCover binder={binder} className="w-10 h-14 rounded" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
            <Pencil className="h-3.5 w-3.5 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-xl font-bold">{binder.name}</h1>
          {binder.description && <p className="text-sm text-muted-foreground">{binder.description}</p>}
        </div>
        <BinderActions binderId={binder.id} onRefresh={load} />
      </div>

      <div className="flex gap-4 mb-6">
        <div className="bg-card border rounded-lg px-4 py-3 flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-card border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cards</p>
          <p className="text-2xl font-bold">{cardCount}</p>
        </div>
        <div className="bg-card border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pages</p>
          <p className="text-2xl font-bold">{binder.pages.length}</p>
        </div>
      </div>

      <PagesGallery pages={binder.pages} binderId={binder.id} onRefresh={load} />

      {binder.cards.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">All Cards</h2>
          <BinderCardGrid cards={binder.cards} binderId={binder.id} onRefresh={load} />
        </>
      )}

      {/* Edit Cover Dialog */}
      <Dialog open={coverOpen} onOpenChange={setCoverOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Cover</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCoverMode('color')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${coverMode === 'color' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}
              >
                <Palette className="h-3.5 w-3.5" /> Color
              </button>
              <button
                type="button"
                onClick={() => setCoverMode('image')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${coverMode === 'image' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}
              >
                <ImageIcon className="h-3.5 w-3.5" /> Image
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Preview */}
              {coverMode === 'image' && coverImagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImagePreview} alt="Cover preview" className="w-14 h-20 rounded object-cover flex-shrink-0 border" />
              ) : (
                <BinderCover binder={editPreviewBinder} className="w-14 h-20 rounded flex-shrink-0 border" />
              )}

              {coverMode === 'color' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={coverColor}
                    onChange={e => setCoverColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="text-sm text-muted-foreground font-mono">{coverColor}</span>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {coverImageFile ? 'Change Image' : 'Choose Image'}
                  </Button>
                  {coverImageFile && (
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-[180px]">{coverImageFile.name}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCoverOpen(false)}>Cancel</Button>
            <Button
              onClick={saveCover}
              disabled={coverSaving || (coverMode === 'image' && !coverImageFile && !binder.coverImagePath)}
            >
              {coverSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
