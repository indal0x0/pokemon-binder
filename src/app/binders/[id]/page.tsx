import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload } from 'lucide-react'
import { BinderCardGrid } from '@/components/BinderCardGrid'
import { BinderActions } from '@/components/BinderActions'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function BinderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const binder = await prisma.binder.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { pageNumber: 'asc' } },
      cards: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!binder) notFound()

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
        <BinderActions binderId={binder.id} />
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
        <Link href={`/binders/${binder.id}/upload`}>
          <Button size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Pages
          </Button>
        </Link>
      </div>

      {binder.cards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No cards yet. Upload binder page photos to get started.</p>
        </div>
      ) : (
        <BinderCardGrid cards={binder.cards} binderId={binder.id} />
      )}
    </main>
  )
}
