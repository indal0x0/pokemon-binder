export interface TCGCard {
  id: string
  name: string
  number: string
  rarity?: string
  images: {
    small: string
    large: string
  }
  set: {
    id: string
    name: string
    series: string
  }
  tcgplayer?: {
    url: string
    updatedAt: string
    prices: Record<string, {
      low: number
      mid: number
      high: number
      market: number
      directLow?: number
    }>
  }
}

const BASE_URL = 'https://api.pokemontcg.io/v2'

async function searchCards(query: string): Promise<TCGCard[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (process.env.POKEMON_TCG_API_KEY) {
    headers['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY
  }

  const url = `${BASE_URL}/cards?q=${encodeURIComponent(query)}&pageSize=10&select=id,name,number,rarity,images,set,tcgplayer`
  const res = await fetch(url, { headers })

  if (!res.ok) return []

  const data = await res.json()
  return data.data || []
}

export interface ExtractedPrices {
  priceLow: number | null
  priceMid: number | null
  priceMarket: number | null
  priceHigh: number | null
  priceUpdatedAt: Date | null
}

export function extractBestPrice(tcgplayer: TCGCard['tcgplayer'], notes?: string | null): ExtractedPrices {
  if (!tcgplayer?.prices) {
    return { priceLow: null, priceMid: null, priceMarket: null, priceHigh: null, priceUpdatedAt: null }
  }

  const prices = tcgplayer.prices
  const notesLower = (notes || '').toLowerCase()

  let variant = prices['normal']

  if (notesLower.includes('1st edition') || notesLower.includes('first edition')) {
    variant = prices['1stEditionHolofoil'] ?? prices['1stEditionNormal'] ?? variant
  } else if (notesLower.includes('holo') && !notesLower.includes('reverse')) {
    variant = prices['holofoil'] ?? variant
  } else if (notesLower.includes('reverse')) {
    variant = prices['reverseHolofoil'] ?? variant
  } else {
    // Best available: prefer holofoil > normal > reverse > anything
    variant = prices['holofoil'] ?? prices['normal'] ?? prices['reverseHolofoil'] ?? Object.values(prices)[0]
  }

  if (!variant) return { priceLow: null, priceMid: null, priceMarket: null, priceHigh: null, priceUpdatedAt: null }

  return {
    priceLow: variant.low ?? null,
    priceMid: variant.mid ?? null,
    priceMarket: variant.market ?? null,
    priceHigh: variant.high ?? null,
    priceUpdatedAt: tcgplayer.updatedAt ? new Date(tcgplayer.updatedAt) : null,
  }
}

export async function matchCard(identified: {
  name: string
  setName: string | null
  collectorNumber: string | null
}): Promise<TCGCard | null> {
  const safeName = identified.name.replace(/"/g, '\\"')

  // Attempt 1: name + collector number
  if (identified.collectorNumber) {
    const results = await searchCards(`name:"${safeName}" number:${identified.collectorNumber}`)
    if (results.length === 1) return results[0]
    if (results.length > 1 && identified.setName) {
      const match = results.find(r =>
        r.set.name.toLowerCase().includes(identified.setName!.toLowerCase()) ||
        identified.setName!.toLowerCase().includes(r.set.name.toLowerCase())
      )
      if (match) return match
      return results[0]
    }
    if (results.length > 0) return results[0]
  }

  // Attempt 2: name + set name
  if (identified.setName) {
    const safeSet = identified.setName.replace(/"/g, '\\"')
    const results = await searchCards(`name:"${safeName}" set.name:"${safeSet}"`)
    if (results.length > 0) return results[0]
  }

  // Attempt 3: name only, pick highest market price
  const results = await searchCards(`name:"${safeName}"`)
  if (results.length > 0) {
    return results.sort((a, b) => {
      const priceA = Object.values(a.tcgplayer?.prices || {}).reduce((max, p) => Math.max(max, p.market || 0), 0)
      const priceB = Object.values(b.tcgplayer?.prices || {}).reduce((max, p) => Math.max(max, p.market || 0), 0)
      return priceB - priceA
    })[0]
  }

  return null
}
