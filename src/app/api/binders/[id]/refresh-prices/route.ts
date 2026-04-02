import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { matchCard, extractBestPrice } from '@/lib/pokemon-tcg'

export const maxDuration = 60

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cards = await prisma.binderCard.findMany({ where: { binderId: id } })
  let updated = 0

  for (const card of cards) {
    if (card.tcgApiId.startsWith('unmatched-')) continue
    try {
      const match = await matchCard({ name: card.name, setName: card.setName, collectorNumber: card.collectorNumber })
      if (!match) continue
      const prices = extractBestPrice(match.tcgplayer)
      await prisma.binderCard.update({ where: { id: card.id }, data: prices })
      updated++
    } catch {
      // Continue on error
    }
  }

  return NextResponse.json({ updated })
}
