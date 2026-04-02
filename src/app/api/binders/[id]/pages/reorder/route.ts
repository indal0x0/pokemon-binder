import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Body: { order: string[] } — array of pageIds in the desired order
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { order } = await req.json() as { order: string[] }

  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'order must be an array of page IDs' }, { status: 400 })
  }

  await Promise.all(
    order.map((pageId, index) =>
      prisma.page.updateMany({
        where: { id: pageId, binderId: id },
        data: { position: index },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
