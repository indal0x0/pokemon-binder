'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Pencil, Check, X } from 'lucide-react'
import { BinderCardGrid } from '@/components/BinderCardGrid'
import { BinderActions } from '@/components/BinderActions'
import { BinderCover } from '@/components/BinderCover'
import { CoverPicker, defaultCoverState, type CoverState } from '@/components/CoverPicker'
import { PagesGallery } from '@/components/PagesGallery'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { BinderRow, PageRow, CardRow } from '@/types/electron'

type FullBinder = BinderRow & { pages: PageRow[]; cards: CardRow[] }

function BinderPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const binderId = searchParams.get('id') ?? ''
  const [binder, setBinder] = useState<FullBinder | null>(null)
  const [loading, setLoading] = useState(true)
  const [coverOpen, setCoverOpen] = useState(false)
  const [cover, setCover] = useState<CoverState>(defaultCoverState())
  const [coverSaving, setCoverSaving] = useState(false)

  // Inline name editing
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Inline description editing
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState('')
  const descInputRef = useRef<HTMLInputElement>(null)

  function startEditDesc() {
    if (!binder) return
    setDescValue(binder.description ?? '')
    setEditingDesc(true)
    setTimeout(() => descInputRef.current?.select(), 0)
  }

  async function saveEditDesc() {
    if (!binder || !window.electronAPI) return
    const trimmed = descValue.trim()
    if (trimmed === (binder.description ?? '')) { setEditingDesc(false); return }
    try {
      await window.electronAPI.updateBinder(binder.id, { description: trimmed || null })
      setBinder(prev => prev ? { ...prev, description: trimmed || null } : null)
    } catch { /* keep existing */ }
    setEditingDesc(false)
  }

  function cancelEditDesc() { setEditingDesc(false) }

  function startEditName() {
    if (!binder) return
    setNameValue(binder.name)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.select(), 0)
  }

  async function saveEditName() {
    if (!binder || !window.electronAPI) return
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === binder.name) { setEditingName(false); return }
    try {
      await window.electronAPI.updateBinder(binder.id, { name: trimmed })
      setBinder(prev => prev ? { ...prev, name: trimmed } : null)
    } catch { /* keep existing name */ }
    setEditingName(false)
  }

  function cancelEditName() {
    setEditingName(false)
  }

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

  useEffect(() => {
    if (!binderId || !window.electronAPI) return
    window.electronAPI.scrapeTcgplayerPrices(binderId)
      .then(r => { if (r.updated > 0) toast.info(`Refreshed ${r.updated} TCGPlayer price${r.updated !== 1 ? 's' : ''}`) })
      .catch(() => {})
  }, [binderId])

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
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <Link href="/" className="hover:text-foreground transition-colors">Binders</Link>
        <span className="opacity-40">›</span>
        <span className="text-foreground/70 truncate max-w-48">{binder.name}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative group flex-shrink-0 cursor-pointer" onClick={openEditCover}>
          <BinderCover binder={binder} className="w-10 h-14 rounded" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
            <Pencil className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEditName(); if (e.key === 'Escape') cancelEditName() }}
                onBlur={saveEditName}
                className="text-xl font-bold bg-transparent border-b border-primary outline-none w-full min-w-0"
                autoFocus
              />
              <button onClick={saveEditName} className="text-primary hover:text-primary/80 flex-shrink-0"><Check className="h-4 w-4" /></button>
              <button onClick={cancelEditName} className="text-muted-foreground hover:text-foreground flex-shrink-0"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={startEditName}>
              <h1 className="text-xl font-bold truncate">{binder.name}</h1>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
          )}
          {editingDesc ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={descInputRef}
                value={descValue}
                onChange={e => setDescValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEditDesc(); if (e.key === 'Escape') cancelEditDesc() }}
                onBlur={saveEditDesc}
                className="text-sm text-muted-foreground bg-transparent border-b border-primary outline-none w-full min-w-0"
                placeholder="Add a description..."
              />
              <button onClick={saveEditDesc} className="text-primary flex-shrink-0"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={cancelEditDesc} className="text-muted-foreground flex-shrink-0"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={startEditDesc}>
              <p className="text-sm text-muted-foreground">
                {binder.description || <span className="italic opacity-40">Add description...</span>}
              </p>
              <Pencil className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
          )}
        </div>
        <ThemeSwitcher />
        <BinderActions binderId={binder.id} onRefresh={load} />
      </div>

      <div className="flex gap-3 mb-6">
        <div className="bg-card border border-border/50 rounded-xl px-5 py-4 flex-1 shadow-md shadow-black/20">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">Total Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl px-5 py-4 shadow-md shadow-black/20">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">Cards</p>
          <p className="text-2xl font-bold">{cardCount}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl px-5 py-4 shadow-md shadow-black/20">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">Pages</p>
          <p className="text-2xl font-bold">{binder.pages.length}</p>
        </div>
      </div>

      <PagesGallery pages={binder.pages} binderId={binder.id} onRefresh={load} />

      {binder.cards.length > 0 && (
        <>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 mt-6">All Cards</h2>
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

export default function BinderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}>
      <BinderPageInner />
    </Suspense>
  )
}
