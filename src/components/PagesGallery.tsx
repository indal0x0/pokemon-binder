'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronUp, ChevronDown, Pencil, Trash2, CheckCircle, AlertCircle, Loader2, Plus, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import type { PageRow } from '@/types/electron'

const DIMENSION_PRESETS = [
  { label: '1×1', cols: 1, rows: 1 },
  { label: '2×1', cols: 2, rows: 1 },
  { label: '2×2', cols: 2, rows: 2 },
  { label: '3×3', cols: 3, rows: 3 },
  { label: '3×4', cols: 3, rows: 4 },
  { label: '4×4', cols: 4, rows: 4 },
]

export function PagesGallery({
  pages: initialPages,
  binderId,
  onRefresh,
}: {
  pages: PageRow[]
  binderId: string
  onRefresh: () => void
}) {
  const [pages, setPages] = useState(() =>
    [...initialPages].sort((a, b) => a.position - b.position)
  )
  const [renameTarget, setRenameTarget] = useState<PageRow | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PageRow | null>(null)
  const [saving, setSaving] = useState(false)

  // New page dialog
  const [newPageOpen, setNewPageOpen] = useState(false)
  const [newPageName, setNewPageName] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('3×3')
  const [customCols, setCustomCols] = useState(3)
  const [customRows, setCustomRows] = useState(3)
  const [creating, setCreating] = useState(false)

  const isCustom = selectedPreset === 'Custom'
  const dims = isCustom
    ? { cols: Math.max(1, customCols), rows: Math.max(1, customRows) }
    : DIMENSION_PRESETS.find(p => p.label === selectedPreset) ?? { cols: 3, rows: 3 }

  async function createPage() {
    if (!window.electronAPI) return
    setCreating(true)
    try {
      const page = await window.electronAPI.createPage({
        binderId,
        name: newPageName.trim() || undefined,
        cols: dims.cols,
        rows: dims.rows,
      })
      setPages(prev => [...prev, page])
      setNewPageOpen(false)
      setNewPageName('')
      setSelectedPreset('3×3')
      onRefresh()
      toast.success('Page created')
    } catch {
      toast.error('Failed to create page')
    } finally {
      setCreating(false)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!window.electronAPI) return
    const newPages = [...pages]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newPages.length) return
    ;[newPages[index], newPages[swapIndex]] = [newPages[swapIndex], newPages[index]]
    setPages(newPages)
    try {
      await window.electronAPI.reorderPages(binderId, newPages.map(p => p.id))
      onRefresh()
    } catch {
      toast.error('Failed to reorder pages')
      setPages(pages)
    }
  }

  function openRename(page: PageRow) {
    setRenameTarget(page)
    setRenameValue(page.name)
  }

  async function saveRename() {
    if (!renameTarget || !window.electronAPI) return
    setSaving(true)
    try {
      const newName = renameValue.trim() || `Page ${renameTarget.pageNumber}`
      await window.electronAPI.updatePage(renameTarget.id, { name: newName })
      setPages(prev => prev.map(p => p.id === renameTarget.id ? { ...p, name: newName } : p))
      setRenameTarget(null)
      onRefresh()
    } catch {
      toast.error('Failed to rename page')
    } finally {
      setSaving(false)
    }
  }

  async function deletePage() {
    if (!deleteTarget || !window.electronAPI) return
    setSaving(true)
    try {
      await window.electronAPI.deletePage(deleteTarget.id)
      setPages(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Page deleted')
      onRefresh()
    } catch {
      toast.error('Failed to delete page')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pages</h2>
          <Button size="sm" variant="outline" onClick={() => setNewPageOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Page
          </Button>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <LayoutGrid className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No pages yet. Create one to start adding cards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pages.map((page, index) => {
              const imageUrl = window.electronAPI?.getImageUrl(page.imagePath || null)
              return (
                <div key={page.id} className="relative group rounded-lg border bg-card overflow-hidden">
                  <Link href={`/page-detail?id=${page.id}&binderId=${binderId}`}>
                    {page.firstCardImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={page.firstCardImageUrl} alt={page.name} className="w-full aspect-[3/4] object-cover" />
                    ) : imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={page.name} className="w-full aspect-[3/4] object-cover" />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-secondary flex flex-col items-center justify-center gap-1">
                        <span className="text-sm font-semibold text-muted-foreground">{page.pageNumber}</span>
                        <span className="text-xs text-muted-foreground/60">{page.cols ?? 3}×{page.rows ?? 3}</span>
                      </div>
                    )}
                  </Link>

                  <div className="absolute top-1.5 left-1.5">
                    {page.status === 'done' && <CheckCircle className="h-4 w-4 text-green-500 drop-shadow" />}
                    {page.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive drop-shadow" />}
                    {page.status === 'processing' && <Loader2 className="h-4 w-4 text-primary animate-spin drop-shadow" />}
                  </div>

                  <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                    <span className="text-xs font-medium truncate">{page.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{page.cardCount ?? 0} cards</span>
                  </div>

                  <div className="absolute top-1.5 right-1.5 hidden group-hover:flex flex-col gap-1">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="bg-background/90 rounded p-0.5 hover:bg-background disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === pages.length - 1}
                      className="bg-background/90 rounded p-0.5 hover:bg-background disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openRename(page)}
                      className="bg-background/90 rounded p-0.5 hover:bg-background"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(page)}
                      className="bg-background/90 rounded p-0.5 hover:bg-background text-destructive"
                      title="Delete page"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Page dialog */}
      <Dialog open={newPageOpen} onOpenChange={open => !open && setNewPageOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder={`Page ${pages.length + 1}`}
                value={newPageName}
                onChange={e => setNewPageName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createPage()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Grid size</Label>
              <div className="grid grid-cols-3 gap-2">
                {DIMENSION_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setSelectedPreset(preset.label)}
                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                      selectedPreset === preset.label
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedPreset('Custom')}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    isCustom
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  Custom
                </button>
              </div>
              {isCustom && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Columns</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={customCols}
                      onChange={e => setCustomCols(Number(e.target.value))}
                    />
                  </div>
                  <span className="mt-5 text-muted-foreground">×</span>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Rows</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={customRows}
                      onChange={e => setCustomRows(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {dims.cols} × {dims.rows} = {dims.cols * dims.rows} card slots
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPageOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={createPage} disabled={creating}>
              {creating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creating...</> : 'Create Page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={open => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename page</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveRename} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete the page and all {deleteTarget?.cardCount ?? 0} cards on it. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
            <Button variant="destructive" onClick={deletePage} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
