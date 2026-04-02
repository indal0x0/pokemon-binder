import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { identifyCardsOnPage } from '@/lib/claude'
import { matchCard, extractBestPrice } from '@/lib/pokemon-tcg'
import { getUploadDir, getImageServingPath } from '@/lib/storage'
import * as fs from 'fs'
import * as path from 'path'
import { createId } from '@paralleldrive/cuid2'

export const maxDuration = 120

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const binder = await prisma.binder.findUnique({ where: { id } })
  if (!binder) return NextResponse.json({ error: 'Binder not found' }, { status: 404 })

  const formData = await req.formData()
  const files = formData.getAll('images') as File[]

  if (!files.length) return NextResponse.json({ error: 'No images provided' }, { status: 400 })

  const uploadDir = getUploadDir(id)
  fs.mkdirSync(uploadDir, { recursive: true })

  const existingPages = await prisma.page.count({ where: { binderId: id } })
  const results = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const filename = `${createId()}.${ext}`
    const filePath = path.join(uploadDir, filename)
    const servingPath = getImageServingPath(id, filename)

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    const pageNumber = existingPages + i + 1
    const page = await prisma.page.create({
      data: {
        binderId: id,
        pageNumber,
        position: pageNumber,
        name: `Page ${pageNumber}`,
        imagePath: servingPath,
        status: 'processing',
      },
    })

    try {
      const { cards: identified, rawText } = await identifyCardsOnPage(servingPath)

      const savedCards = []
      for (const card of identified) {
        const match = await matchCard(card)
        const prices = extractBestPrice(match?.tcgplayer, card.notes)

        const saved = await prisma.binderCard.create({
          data: {
            binderId: id,
            pageId: page.id,
            tcgApiId: match?.id ?? `unmatched-${createId()}`,
            name: match?.name ?? card.name,
            setId: match?.set.id ?? 'unknown',
            setName: match?.set.name ?? card.setName ?? 'Unknown Set',
            collectorNumber: match?.number ?? card.collectorNumber ?? '',
            rarity: match?.rarity ?? null,
            imageUrl: match?.images?.small ?? null,
            quantity: card.quantity,
            condition: card.condition,
            ...prices,
          },
        })
        savedCards.push(saved)
      }

      await prisma.page.update({
        where: { id: page.id },
        data: { status: 'done', rawAiOutput: rawText, processedAt: new Date() },
      })

      results.push({ pageId: page.id, pageNumber, cardsFound: savedCards.length, cards: savedCards })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      await prisma.page.update({
        where: { id: page.id },
        data: { status: 'error', rawAiOutput: errorMsg },
      })
      results.push({ pageId: page.id, pageNumber, error: errorMsg })
    }
  }

  return NextResponse.json({ results })
}
