'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronUp, ChevronDown, Pencil, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PageRow } from '@/types/electron'

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

  if (pages.length === 0) return null

  return (
    <>
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Pages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {pages.map((page, index) => {
            const imageUrl = window.electronAPI?.getImageUrl(page.imagePath || null)
            return (
              <div key={page.id} className="relative group rounded-lg border bg-card overflow-hidden">
                <Link href={`/page-detail?id=${page.id}&binderId=${binderId}`}>
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={page.name} className="w-full aspect-[3/4] object-cover" />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-secondary flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No image</span>
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
      </div>

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
