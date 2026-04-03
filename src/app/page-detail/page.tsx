'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BinderCardGrid } from '@/components/BinderCardGrid'
import type { PageRow, CardRow } from '@/types/electron'

type FullPage = PageRow & { cards: CardRow[] }

export default function PageDetailPage() {
  const router = useRouter()
  const [page, setPage] = useState<FullPage | null>(null)
  const [loading, setLoading] = useState(true)

  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()
  const pageId = params.get('id') ?? ''
  const binderId = params.get('binderId') ?? ''

  const load = useCallback(async () => {
    if (!pageId || !window.electronAPI) return
    const data = await window.electronAPI.getPage(pageId)
    if (!data) { router.push('/'); return }
    setPage(data)
    setLoading(false)
  }, [pageId, router])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
  if (!page) return null

  const pageLabel = page.name || `Page ${page.pageNumber}`
  const imageUrl = window.electronAPI?.getImageUrl(page.imagePath || null)

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/binder?id=${binderId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{pageLabel}</h1>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={pageLabel}
            className="w-48 rounded-lg border object-cover"
          />
        )}
        <div className="flex flex-col gap-2">
          <div className="bg-card border rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cards on page</p>
            <p className="text-2xl font-bold">{page.cards.length}</p>
          </div>
          <div className="bg-card border rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
            <p className="text-sm font-medium capitalize">{page.status}</p>
          </div>
        </div>
      </div>

      {page.cards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No cards were identified on this page.</p>
        </div>
      ) : (
        <BinderCardGrid cards={page.cards} binderId={binderId} onRefresh={load} />
      )}
    </main>
  )
}
