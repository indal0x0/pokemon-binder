import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateCardSchema } from '@/lib/validations'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; cardId: string }> }) {
  const { id, cardId } = await params
  const body = await req.json()
  const parsed = UpdateCardSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const card = await prisma.binderCard.update({
    where: { id: cardId, binderId: id },
    data: parsed.data,
  })
  return NextResponse.json(card)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; cardId: string }> }) {
  const { id, cardId } = await params
  await prisma.binderCard.delete({ where: { id: cardId, binderId: id } })
  return new NextResponse(null, { status: 204 })
}
