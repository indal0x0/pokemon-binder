'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function BinderActions({ binderId }: { binderId: string }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function refreshPrices() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/binders/${binderId}/refresh-prices`, { method: 'POST' })
      const data = await res.json()
      toast.success(`Updated prices for ${data.updated} cards`)
      router.refresh()
    } finally {
      setRefreshing(false)
    }
  }

  async function deleteBinder() {
    if (!confirm('Delete this binder and all its cards?')) return
    setDeleting(true)
    await fetch(`/api/binders/${binderId}`, { method: 'DELETE' })
    router.push('/')
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={refreshPrices} disabled={refreshing}>
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Refreshing...' : 'Refresh Prices'}
      </Button>
      <Button variant="outline" size="sm" onClick={deleteBinder} disabled={deleting} className="text-destructive hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
