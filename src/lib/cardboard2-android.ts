/**
 * cardboard2.com API client for Android/Capacitor.
 * Ported from electron/cardboard2.js — pure fetch() calls, no Node.js dependencies.
 */

const CB2_URL = 'https://cardboard2.com/api/cards'

let _cache: any[] | null = null
let _fetchPromise: Promise<any[]> | null = null

async function loadData(): Promise<any[]> {
  if (_fetchPromise) return _fetchPromise
  _fetchPromise = (async () => {
    const res = await fetch(CB2_URL, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`cardboard2 API returned ${res.status}`)
    const data = await res.json()
    const flat: any[] = []
    for (const cards of Object.values(data.cardsBySet || {})) {
      for (const c of (cards as any[])) flat.push(c)
    }
    _cache = flat
    return flat
  })()
  return _fetchPromise
}

function parseId(tcgApiId: string) {
  const parts = tcgApiId.split('::')
  return { serial: parts[0], stem: parts[1] ?? null }
}

function findCard(allCards: any[], tcgApiId: string, name?: string, imageUrl?: string | null) {
  const { serial, stem } = parseId(tcgApiId)
  const matches = allCards.filter(c => c.card_serial === serial)

  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]

  const normStem = (s: string) => (s || '').replace(/_[A-Z]{2}$/, '')

  function imageStem(c: any): string {
    const fromFilename = (c.image_filename || '').replace(/\.[^.]+$/, '')
    if (fromFilename) return fromFilename
    return (c.limitlesstcg_image_url || '').split('/').pop()?.replace(/\.[^.]+$/, '') || ''
  }

  if (imageUrl && !imageUrl.startsWith('uploads/')) {
    const urlStem = imageUrl.split('/').pop()?.replace(/\.[^.]+$/, '') || ''
    if (urlStem) {
      const byUrl = matches.find(c => normStem(imageStem(c)) === normStem(urlStem))
      if (byUrl) return byUrl
    }
  }

  if (stem) {
    const byImage = matches.find(c => normStem(imageStem(c)) === normStem(stem))
    if (byImage) return byImage
  } else {
    const base = matches.find(c => normStem(imageStem(c)) === normStem(serial))
    if (base) return base
  }

  if (name) {
    const normalize = (s: string) => (s || '').toLowerCase().trim()
    const byName = matches.find(c => normalize(c.card_name) === normalize(name))
    if (byName) return byName
  }

  return matches[0]
}

export async function lookupOpCard(tcgApiId: string, name?: string, imageUrl?: string | null) {
  try {
    const allCards = await loadData()
    const card = findCard(allCards, tcgApiId, name, imageUrl)
    if (!card) return null
    return {
      priceMarket: card.current_price ? parseFloat(card.current_price) : null,
      priceLow: card.value_amount ? parseFloat(card.value_amount) : null,
      card_effect: card.card_effect || null,
      cost: card.cost || null,
      power: card.power || null,
      attributes: card.attributes || null,
      counter: card.counter || null,
      card_type: card.type || null,
      abilities: Array.isArray(card.abilities) ? card.abilities : [],
    }
  } catch {
    return null
  }
}

export async function refreshOpPrices(binderCards: Array<{ id: string; tcgApiId: string; name: string; imageUrl: string | null }>) {
  const allCards = await loadData()
  const updates: Array<{ id: string; priceMarket: number | null; priceLow: number | null }> = []
  for (const bc of binderCards) {
    const card = findCard(allCards, bc.tcgApiId, bc.name, bc.imageUrl)
    if (!card) continue
    const priceMarket = card.current_price ? parseFloat(card.current_price) : null
    const priceLow = card.value_amount ? parseFloat(card.value_amount) : null
    if (priceMarket !== null || priceLow !== null) {
      updates.push({ id: bc.id, priceMarket, priceLow })
    }
  }
  return updates
}
