import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateBinderSchema } from '@/lib/validations'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const binder = await prisma.binder.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { pageNumber: 'asc' } },
      cards: {
        orderBy: { createdAt: 'asc' },
        include: { page: { select: { pageNumber: true } } },
      },
    },
  })

  if (!binder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const totalValue = binder.cards.reduce((sum, c) => sum + (c.priceMarket || 0) * c.quantity, 0)
  return NextResponse.json({ ...binder, totalValue })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = UpdateBinderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const binder = await prisma.binder.update({
    where: { id },
    data: parsed.data,
  })
  return NextResponse.json(binder)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.binder.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
