/**
 * TCG API client for the Android/Capacitor layer.
 * Ported from electron/tcg.js — pure fetch() calls, no Node.js dependencies.
 */

import type { TcgSearchResult, TcgCardResult, FullCardPricing } from '@/types/electron'

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en'
const POKEMONTCG_BASE = 'https://api.pokemontcg.io/v2'
const PAGE_SIZE = 30

const POCKET_SET_IDS = new Set(['A1', 'A1a', 'A2', 'A2a', 'A2b', 'A3', 'A3a', 'A3b', 'P-A', 'PA'])

function isPocketCard(id: string): boolean {
  const setId = extractSetId(id)
  return id.startsWith('tcgp') || setId.startsWith('tcgp') || POCKET_SET_IDS.has(setId)
}

function extractSetId(cardId: string): string {
  const lastDash = (cardId || '').lastIndexOf('-')
  return lastDash > 0 ? cardId.slice(0, lastDash) : 'unknown'
}

const setCache = new Map<string, { name: string; year: number | null } | null>()

async function getSetInfo(setId: string) {
  if (setCache.has(setId)) return setCache.get(setId)!
  try {
    const response = await fetch(`${TCGDEX_BASE}/sets/${encodeURIComponent(setId)}`)
    if (!response.ok) { setCache.set(setId, null); return null }
    const set = await response.json()
    const info = {
      name: set.name || setId,
      year: set.releaseDate ? parseInt(String(set.releaseDate).split(/[-/]/)[0]) : null,
    }
    setCache.set(setId, info)
    return info
  } catch {
    setCache.set(setId, null)
    return null
  }
}

async function getPokemonTcgPricing(tcgApiId: string): Promise<FullCardPricing | null> {
  if (isPocketCard(tcgApiId)) return null
  try {
    const res = await fetch(`${POKEMONTCG_BASE}/cards/${encodeURIComponent(tcgApiId)}`)
    if (!res.ok) return null
    const json = await res.json()
    const card = json.data
    if (!card) return null
    const tcgPrices = card?.tcgplayer?.prices ?? null
    const cmPrices = card?.cardmarket?.prices ?? null

    const variantMap: Record<string, string> = {
      normal: 'Normal',
      holofoil: 'Holofoil',
      reverseHolofoil: 'Reverse Holo',
      '1stEditionHolofoil': '1st Ed. Holofoil',
      '1stEditionNormal': '1st Ed. Normal',
      unlimitedHolofoil: 'Unlimited Holofoil',
    }
    const variants = []
    for (const [key, label] of Object.entries(variantMap)) {
      if (tcgPrices?.[key]) {
        const p = tcgPrices[key]
        variants.push({ label, low: p.low ?? null, mid: p.mid ?? null, market: p.market ?? null, high: p.high ?? null })
      }
    }
    const bestMarket = variants.reduce<number | null>((max, v) =>
      v.market != null && v.market > (max ?? -Infinity) ? v.market : max, null)
    if (!variants.length && bestMarket == null && !cmPrices) return null
    return {
      variants,
      bestMarket,
      cardmarket: cmPrices ? {
        avg: cmPrices.averageSellPrice ?? null,
        low: cmPrices.lowPrice ?? null,
        trend: cmPrices.trendPrice ?? null,
        avg7: cmPrices.avg7 ?? null,
        avg30: cmPrices.avg30 ?? null,
      } : null,
    }
  } catch {
    return null
  }
}

export async function getFullCardPricing(tcgApiId: string): Promise<FullCardPricing | null> {
  const ptcg = await getPokemonTcgPricing(tcgApiId)
  if (ptcg) return ptcg

  try {
    const response = await fetch(`${TCGDEX_BASE}/cards/${encodeURIComponent(tcgApiId)}`)
    if (!response.ok) return null
    const card = await response.json()
    const tcgplayer = card.pricing?.tcgplayer ?? null
    const cardmarket = card.pricing?.cardmarket ?? null
    const variants = []
    if (tcgplayer) {
      const variantLabels: Record<string, string> = { normal: 'Normal', reverseHolo: 'Reverse Holo', holofoil: 'Holofoil', firstEdition: '1st Edition', unlimited: 'Unlimited' }
      for (const [key, label] of Object.entries(variantLabels)) {
        if (tcgplayer[key] && typeof tcgplayer[key] === 'object') {
          const p = tcgplayer[key]
          variants.push({ label, low: p.lowPrice ?? null, mid: p.midPrice ?? null, market: p.marketPrice ?? null, high: p.highPrice ?? null })
        }
      }
    }
    const bestMarket = variants.reduce<number | null>((max, v) =>
      v.market != null && v.market > (max ?? -Infinity) ? v.market : max, null)
    return {
      variants,
      bestMarket,
      cardmarket: cardmarket ? {
        avg: cardmarket.avg ?? null, low: cardmarket.low ?? null,
        trend: cardmarket.trend ?? null, avg7: cardmarket.avg7 ?? null, avg30: cardmarket.avg30 ?? null,
      } : null,
    }
  } catch {
    return null
  }
}

export async function getCardPricesBatch(tcgApiIds: string[]): Promise<Record<string, FullCardPricing | null>> {
  const results = await Promise.all(
    tcgApiIds.map(id => getFullCardPricing(id).catch(() => null))
  )
  const map: Record<string, FullCardPricing | null> = {}
  tcgApiIds.forEach((id, i) => { map[id] = results[i] })
  return map
}

export async function searchCards(query: string, page = 1): Promise<TcgSearchResult> {
  if (!query || query.trim().length < 2) return { cards: [], hasMore: false }

  const url = `${TCGDEX_BASE}/cards?name=${encodeURIComponent(query.trim())}&pagination:itemsPerPage=${PAGE_SIZE}&pagination:page=${page}`
  let rawCards: any[]
  try {
    const response = await fetch(url)
    if (!response.ok) return { cards: [], hasMore: false }
    rawCards = await response.json()
    if (!Array.isArray(rawCards)) return { cards: [], hasMore: false }
  } catch {
    return { cards: [], hasMore: false }
  }

  const uniqueSetIds = [...new Set(rawCards.map((c: any) => extractSetId(c.id)))]
  const setInfos = await Promise.all(uniqueSetIds.map(id => getSetInfo(id)))
  const setMap = Object.fromEntries(uniqueSetIds.map((id, i) => [id, setInfos[i]]))

  const cards: TcgCardResult[] = rawCards.map((card: any) => {
    const setId = extractSetId(card.id)
    const setInfo = setMap[setId]
    const imageUrl = card.image ? `${card.image}/high.png` : null
    return {
      tcgApiId: card.id || `unknown-${Math.random().toString(36).slice(2)}`,
      name: card.name || 'Unknown Card',
      setId,
      setName: setInfo?.name || setId,
      collectorNumber: String(card.localId || ''),
      rarity: null,
      imageUrl,
      year: setInfo?.year ?? null,
      isPocket: isPocketCard(String(card.id || '')),
      priceLow: null,
      priceMid: null,
      priceMarket: null,
      priceHigh: null,
      priceUpdatedAt: null,
    }
  })

  return { cards, hasMore: rawCards.length === PAGE_SIZE }
}

let _eurUsdRate: number | null = null

export async function fetchEurUsdRate(): Promise<number> {
  if (_eurUsdRate !== null) return _eurUsdRate
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error('rate fetch failed')
    const data = await res.json()
    _eurUsdRate = data?.rates?.USD ?? 1.10
  } catch {
    _eurUsdRate = 1.10
  }
  return _eurUsdRate!
}

export async function getPokemonSets(): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch(`${TCGDEX_BASE}/sets`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data)
      ? data.map((s: any) => ({ id: s.id || '', name: s.name || s.id || '' })).filter((s: any) => s.id)
      : []
  } catch {
    return []
  }
}
