/**
 * One Piece Card Game API client for Android/Capacitor.
 * Ported from electron/optcg.js — pure fetch() calls, no Node.js dependencies.
 */

import type { OnePieceCardResult } from '@/types/electron'

const OPTCG_BASE = 'https://www.optcgapi.com/api'

let _setsCache: { id: string; name: string }[] | null = null

export async function getOnePieceSets(): Promise<{ id: string; name: string }[]> {
  if (_setsCache) return _setsCache
  try {
    const res = await fetch(`${OPTCG_BASE}/allSets/`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    const sets = Array.isArray(data)
      ? data.map((s: any) => ({ id: s.set_id ?? s.id ?? '', name: s.set_name ?? s.name ?? s.id ?? '' })).filter((s: any) => s.id)
      : []
    _setsCache = sets
    return sets
  } catch {
    return []
  }
}

function makeOnePieceId(card: any): string {
  const base = card.card_set_id
  if (!base) return `op-${Math.random().toString(36).slice(2)}`
  if (!card.card_image) return base
  const stem = card.card_image.split('/').pop()?.replace(/\.[^.]+$/, '') || ''
  return stem && stem !== base ? `${base}::${stem}` : base
}

function mapCard(card: any): OnePieceCardResult {
  return {
    tcgApiId: makeOnePieceId(card),
    name: card.card_name || 'Unknown Card',
    setId: card.set_id || 'unknown',
    setName: card.set_name || 'Unknown Set',
    collectorNumber: card.card_set_id || '',
    rarity: card.rarity || null,
    imageUrl: card.card_image || null,
    year: null,
    cardGame: 'onepiece',
    priceLow: null,
    priceMid: null,
    priceMarket: null,
    priceHigh: null,
    priceUpdatedAt: null,
  }
}

export async function searchOnePieceCards(
  query: string,
  setId?: string
): Promise<{ cards: OnePieceCardResult[]; hasMore: false }> {
  if (!query || query.trim().length < 2) return { cards: [], hasMore: false }

  const params = new URLSearchParams({ card_name: query.trim() })
  if (setId) params.set('set_id', setId)

  try {
    const url = `${OPTCG_BASE}/sets/filtered/?${params.toString()}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { cards: [], hasMore: false }
    const data = await res.json()
    const rawCards = Array.isArray(data) ? data : (data.cards ?? [])
    return { cards: rawCards.map(mapCard), hasMore: false }
  } catch {
    return { cards: [], hasMore: false }
  }
}
