import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveImagePath } from '@/lib/storage'
import * as fs from 'fs'

type Params = Promise<{ id: string; pageId: string }>

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { id, pageId } = await params
  const body = await req.json()

  const page = await prisma.page.findFirst({ where: { id: pageId, binderId: id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.page.update({
    where: { id: pageId },
    data: {
      ...(typeof body.name === 'string' ? { name: body.name } : {}),
      ...(typeof body.position === 'number' ? { position: body.position } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  const { id, pageId } = await params

  const page = await prisma.page.findFirst({ where: { id: pageId, binderId: id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete the image file from disk
  if (page.imagePath) {
    try {
      const absolutePath = resolveImagePath(page.imagePath)
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath)
      }
    } catch {
      // Non-fatal: log and continue
    }
  }

  await prisma.page.delete({ where: { id: pageId } })
  return new NextResponse(null, { status: 204 })
}
