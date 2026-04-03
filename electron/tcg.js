/**
 * TCGDex API client for the Electron main process.
 * Free, no API key required. Includes TCGPlayer prices via full card endpoint.
 */

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en'

// In-process cache for set info (name + year) to avoid redundant fetches
const setCache = new Map()

async function getSetInfo(setId) {
  if (setCache.has(setId)) return setCache.get(setId)
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

function extractSetId(cardId) {
  const lastDash = (cardId || '').lastIndexOf('-')
  return lastDash > 0 ? cardId.slice(0, lastDash) : 'unknown'
}

function extractPricing(card) {
  const tcgplayer = card.pricing?.tcgplayer
  if (!tcgplayer) return null
  // Prefer normal, fall back to reverse, then any available variant
  const pricing = tcgplayer.normal || tcgplayer.reverse || Object.values(tcgplayer).find(v => v && typeof v === 'object')
  if (!pricing) return null
  return {
    priceLow: pricing.lowPrice ?? null,
    priceMid: pricing.midPrice ?? null,
    priceMarket: pricing.marketPrice ?? null,
    priceHigh: pricing.highPrice ?? null,
    priceUpdatedAt: new Date().toISOString(),
  }
}

async function fetchCardPrices(tcgApiId) {
  try {
    const response = await fetch(`${TCGDEX_BASE}/cards/${encodeURIComponent(tcgApiId)}`)
    if (!response.ok) return null
    const card = await response.json()
    return extractPricing(card)
  } catch {
    return null
  }
}

const PAGE_SIZE = 30

async function searchCards(query, page = 1) {
  if (!query || query.trim().length < 2) return { cards: [], hasMore: false }

  const url = `${TCGDEX_BASE}/cards?name=${encodeURIComponent(query.trim())}&pagination:itemsPerPage=${PAGE_SIZE}&pagination:page=${page}`
  let rawCards
  try {
    const response = await fetch(url)
    if (!response.ok) return { cards: [], hasMore: false }
    rawCards = await response.json()
    if (!Array.isArray(rawCards)) return { cards: [], hasMore: false }
  } catch {
    return { cards: [], hasMore: false }
  }

  // Fetch set info for all unique setIds in parallel
  const uniqueSetIds = [...new Set(rawCards.map(c => extractSetId(c.id)))]
  const setInfos = await Promise.all(uniqueSetIds.map(id => getSetInfo(id)))
  const setMap = Object.fromEntries(uniqueSetIds.map((id, i) => [id, setInfos[i]]))

  const cards = rawCards.map(card => {
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
      priceLow: null,
      priceMid: null,
      priceMarket: null,
      priceHigh: null,
      priceUpdatedAt: null,
    }
  })

  return { cards, hasMore: rawCards.length === PAGE_SIZE }
}

// Stub — AI scanning is disabled (Coming Soon)
async function matchCard() {
  return null
}

async function refreshCardPrices(tcgApiId) {
  return fetchCardPrices(tcgApiId)
}

module.exports = { matchCard, searchCards, refreshCardPrices, fetchCardPrices }
