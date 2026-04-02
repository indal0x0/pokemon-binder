import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  if (!q) return NextResponse.json([])

  const headers: Record<string, string> = {}
  if (process.env.POKEMON_TCG_API_KEY) {
    headers['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY
  }

  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=20&select=id,name,number,rarity,images,set,tcgplayer`,
    { headers }
  )

  if (!res.ok) return NextResponse.json([])
  const data = await res.json()
  return NextResponse.json(data.data || [])
}
