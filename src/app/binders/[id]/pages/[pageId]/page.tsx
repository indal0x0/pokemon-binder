import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import { BinderCardGrid } from '@/components/BinderCardGrid'

export const dynamic = 'force-dynamic'

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>
}) {
  const { id, pageId } = await params

  const page = await prisma.page.findFirst({
    where: { id: pageId, binderId: id },
    include: {
      cards: { orderBy: { createdAt: 'asc' } },
      binder: { select: { name: true } },
    },
  })

  if (!page) notFound()

  const pageLabel = page.name || `Page ${page.pageNumber}`

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/binders/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">{page.binder.name}</p>
          <h1 className="text-xl font-bold">{pageLabel}</h1>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page.imagePath}
          alt={pageLabel}
          className="w-48 rounded-lg border object-cover"
        />
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
        <BinderCardGrid cards={page.cards} binderId={id} />
      )}
    </main>
  )
}
