/**
 * One Piece Card Game API client (optcgapi.com)
 * Free, no API key required.
 */

const OPTCG_BASE = 'https://www.optcgapi.com/api'

// In-process set cache
let _setsCache = null

async function getOnePieceSets() {
  if (_setsCache) return _setsCache
  try {
    const res = await fetch(`${OPTCG_BASE}/allSets/`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    // API returns array of set objects; extract id/name
    const sets = Array.isArray(data)
      ? data.map(s => ({ id: s.set_id ?? s.id ?? '', name: s.set_name ?? s.name ?? s.id ?? '' })).filter(s => s.id)
      : []
    _setsCache = sets
    return sets
  } catch {
    return []
  }
}

function mapCard(card) {
  return {
    tcgApiId: card.card_set_id || `op-${Math.random().toString(36).slice(2)}`,
    name: card.card_name || 'Unknown Card',
    setId: card.set_id || 'unknown',
    setName: card.set_name || 'Unknown Set',
    collectorNumber: card.card_set_id || '',
    rarity: card.rarity || null,
    imageUrl: card.card_image || null,
    year: null,
    cardGame: 'onepiece',
    // One Piece cards have no automated pricing
    priceLow: null,
    priceMid: null,
    priceMarket: null,
    priceHigh: null,
    priceUpdatedAt: null,
  }
}

async function searchOnePieceCards(query, setId) {
  if (!query || query.trim().length < 2) return { cards: [], hasMore: false }

  const params = new URLSearchParams({ card_name: query.trim() })
  if (setId) params.set('set_id', setId)

  try {
    const url = `${OPTCG_BASE}/sets/filtered/?${params.toString()}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { cards: [], hasMore: false }
    const data = await res.json()
    const rawCards = Array.isArray(data) ? data : (data.cards ?? [])
    const cards = rawCards.map(mapCard)
    return { cards, hasMore: false }
  } catch {
    return { cards: [], hasMore: false }
  }
}

module.exports = { searchOnePieceCards, getOnePieceSets }
