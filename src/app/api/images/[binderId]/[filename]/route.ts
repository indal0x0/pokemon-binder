import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

type Params = Promise<{ binderId: string; filename: string }>

export async function GET(_: Request, { params }: { params: Params }) {
  const { binderId, filename } = await params

  // Only allowed in Electron mode (or if userData is explicitly set)
  const userData = process.env.ELECTRON_USER_DATA
  if (!userData) {
    return new NextResponse('Not available in web mode', { status: 404 })
  }

  // Sanitize to prevent path traversal
  const safeBinder = path.basename(binderId)
  const safeFile = path.basename(filename)
  const filePath = path.join(userData, 'uploads', safeBinder, safeFile)

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(safeFile).toLowerCase()
  const contentType =
    ext === '.png' ? 'image/png' :
    ext === '.webp' ? 'image/webp' :
    'image/jpeg'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
