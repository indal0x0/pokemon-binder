'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function BinderActions({ binderId }: { binderId: string }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function refreshPrices() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/binders/${binderId}/refresh-prices`, { method: 'POST' })
      const data = await res.json()
      toast.success(`Updated prices for ${data.updated} cards`)
      router.refresh()
    } catch {
      toast.error('Failed to refresh prices')
    } finally {
      setRefreshing(false)
    }
  }

  async function deleteBinder() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/binders/${binderId}`, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Delete failed')
      }
      router.push('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete binder')
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={refreshPrices} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Prices'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this binder?</DialogTitle>
            <DialogDescription>
              This will permanently delete the binder and all its cards. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteBinder} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
