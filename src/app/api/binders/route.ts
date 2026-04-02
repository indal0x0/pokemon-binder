import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateBinderSchema } from '@/lib/validations'

export async function GET() {
  const binders = await prisma.binder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { cards: true, pages: true } },
      cards: { select: { priceMarket: true, quantity: true } },
    },
  })

  const result = binders.map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
    createdAt: b.createdAt,
    cardCount: b._count.cards,
    pageCount: b._count.pages,
    totalValue: b.cards.reduce((sum, c) => sum + (c.priceMarket || 0) * c.quantity, 0),
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = CreateBinderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const binder = await prisma.binder.create({ data: parsed.data })
  return NextResponse.json(binder, { status: 201 })
}
