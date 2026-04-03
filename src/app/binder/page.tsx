'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Pencil } from 'lucide-react'
import { BinderCardGrid } from '@/components/BinderCardGrid'
import { BinderActions } from '@/components/BinderActions'
import { BinderCover } from '@/components/BinderCover'
import { CoverPicker, defaultCoverState, type CoverState } from '@/components/CoverPicker'
import { PagesGallery } from '@/components/PagesGallery'
import { formatCurrency } from '@/lib/utils'
import type { BinderRow, PageRow, CardRow } from '@/types/electron'

type FullBinder = BinderRow & { pages: PageRow[]; cards: CardRow[] }

export default function BinderPage() {
  const router = useRouter()
  const [binder, setBinder] = useState<FullBinder | null>(null)
  const [loading, setLoading] = useState(true)
  const [coverOpen, setCoverOpen] = useState(false)
  const [cover, setCover] = useState<CoverState>(defaultCoverState())
  const [coverSaving, setCoverSaving] = useState(false)

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
    if (binder.coverPreset) {
      setCover({ mode: 'preset', preset: binder.coverPreset, color: '#3b82f6', pattern: 'none', imageFile: null, imagePreview: null })
    } else if (binder.coverImagePath) {
      setCover({ mode: 'image', preset: null, color: '#3b82f6', pattern: 'none', imageFile: null, imagePreview: window.electronAPI?.getImageUrl(binder.coverImagePath) ?? null })
    } else {
      setCover({ mode: 'color', preset: null, color: binder.coverColor || '#3b82f6', pattern: binder.coverPattern || 'none', imageFile: null, imagePreview: null })
    }
    setCoverOpen(true)
  }

  async function saveCover() {
    if (!binder || !window.electronAPI) return
    setCoverSaving(true)
    try {
      if (cover.mode === 'preset') {
        await window.electronAPI.updateBinder(binder.id, { coverPreset: cover.preset, coverColor: null, coverImagePath: null, coverPattern: null })
      } else if (cover.mode === 'color') {
        await window.electronAPI.updateBinder(binder.id, { coverColor: cover.color, coverPattern: cover.pattern, coverPreset: null, coverImagePath: null })
      } else if (cover.mode === 'image' && cover.imageFile) {
        const path = await window.electronAPI.uploadCover(binder.id, cover.imageFile)
        await window.electronAPI.updateBinder(binder.id, { coverImagePath: path, coverPreset: null, coverColor: null, coverPattern: null })
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

  const saveDisabled = coverSaving || (cover.mode === 'image' && !cover.imageFile && !binder.coverImagePath)

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
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

      <Dialog open={coverOpen} onOpenChange={setCoverOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Cover</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">Cover</Label>
            <CoverPicker state={cover} onChange={next => setCover(prev => ({ ...prev, ...next }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoverOpen(false)}>Cancel</Button>
            <Button onClick={saveCover} disabled={saveDisabled}>
              {coverSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
