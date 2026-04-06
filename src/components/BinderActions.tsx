'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function BinderActions({
  binderId,
  onRefresh,
}: {
  binderId: string
  onRefresh: () => void
}) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState(0)
  const [refreshLabel, setRefreshLabel] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false)

  // Register progress listener for price refresh
  useEffect(() => {
    if (!window.electronAPI?.onPricesProgress) return
    const unsub = window.electronAPI.onPricesProgress(({ current, total, name }) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0
      setRefreshProgress(pct)
      setRefreshLabel(name)
    })
    return unsub
  }, [])

  const refreshPrices = useCallback(async () => {
    if (!window.electronAPI) return
    setRefreshing(true)
    setRefreshProgress(0)
    setRefreshLabel('')
    try {
      const data = await window.electronAPI.refreshPrices(binderId)
      toast.success(`Updated prices for ${data.updated} card${data.updated !== 1 ? 's' : ''}`)
      onRefresh()
    } catch {
      toast.error('Failed to refresh prices')
    } finally {
      setRefreshing(false)
      setRefreshProgress(0)
      setRefreshLabel('')
    }
  }, [binderId, onRefresh])

  async function deleteBinder() {
    if (!window.electronAPI) return
    setDeleting(true)
    try {
      await window.electronAPI.deleteBinder(binderId)
      router.push('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete binder')
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshConfirmOpen(true)}
            disabled={refreshing}
          >
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

        {refreshing && (
          <div className="flex flex-col gap-1">
            <Progress value={refreshProgress} className="gap-0">
              <ProgressTrack className="h-1.5">
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            {refreshLabel && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                {refreshLabel}
              </p>
            )}
          </div>
        )}
      </div>

      <Dialog open={refreshConfirmOpen} onOpenChange={setRefreshConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refresh prices?</DialogTitle>
            <DialogDescription>
              Prices will be fetched from TCGPlayer and Cardmarket for every card in this binder. This may take a few minutes for large binders. Condition adjustments will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefreshConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setRefreshConfirmOpen(false); refreshPrices() }}>
              Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
