'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, Plus, Search } from 'lucide-react'
import { BinderCardGrid } from '@/components/BinderCardGrid'
import { BinderActions } from '@/components/BinderActions'
import { PagesGallery } from '@/components/PagesGallery'
import { formatCurrency } from '@/lib/utils'
import type { BinderRow, PageRow, CardRow } from '@/types/electron'

type FullBinder = BinderRow & { pages: PageRow[]; cards: CardRow[] }

export default function BinderPage() {
  const router = useRouter()
  const [binder, setBinder] = useState<FullBinder | null>(null)
  const [loading, setLoading] = useState(true)

  const binderId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('id') ?? ''
    : ''

  const load = useCallback(async () => {
    if (!binderId || !window.electronAPI) return
    const data = await window.electronAPI.getBinder(binderId)
    if (!data) { router.push('/'); return }
    setBinder(data)
    setLoading(false)
  }, [binderId, router])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
  if (!binder) return null

  const totalValue = binder.cards.reduce((sum, c) => sum + (c.priceMarket || 0) * c.quantity, 0)
  const cardCount = binder.cards.reduce((sum, c) => sum + c.quantity, 0)

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
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

      <div className="flex gap-2 mb-6">
        <Link href={`/upload?binderId=${binder.id}`}>
          <Button size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Pages
          </Button>
        </Link>
        <Link href={`/browse?binderId=${binder.id}`}>
          <Button size="sm" variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Browse Cards
          </Button>
        </Link>
        <Button size="sm" variant="outline" onClick={async () => {
          const name = `Page ${(binder.pages.length + 1)}`
          await window.electronAPI?.createPage({ binderId: binder.id, name, status: 'manual' })
          load()
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </div>

      {binder.pages.length > 0 && (
        <PagesGallery pages={binder.pages} binderId={binder.id} onRefresh={load} />
      )}

      {binder.cards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No cards yet. Upload binder page photos to get started.</p>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">All Cards</h2>
          <BinderCardGrid cards={binder.cards} binderId={binder.id} onRefresh={load} />
        </>
      )}
    </main>
  )
}
