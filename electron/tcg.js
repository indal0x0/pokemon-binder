/**
 * TCGDex API client for the Electron main process.
 * Free, no API key required. Includes TCGPlayer prices via full card endpoint.
 */

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en'

// ─── TCG Pocket blocklist ─────────────────────────────────────────────────────
const POCKET_SET_IDS = new Set(['A1', 'A1a', 'A2', 'A2a', 'A2b', 'A3', 'A3a', 'A3b', 'P-A', 'PA'])
function isPocketCard(id) {
  const setId = extractSetId(id)
  return id.startsWith('tcgp') || setId.startsWith('tcgp') || POCKET_SET_IDS.has(setId)
}

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

const POKEMONTCG_BASE = 'https://api.pokemontcg.io/v2'

async function getPokemonTcgPricing(tcgApiId) {
  if (isPocketCard(tcgApiId)) return null
  try {
    const res = await fetch(`${POKEMONTCG_BASE}/cards/${encodeURIComponent(tcgApiId)}`)
    if (!res.ok) return null
    const json = await res.json()
    const card = json.data
    if (!card) return null
    const tcgPrices = card?.tcgplayer?.prices ?? null
    const cmPrices = card?.cardmarket?.prices ?? null

    const variantMap = {
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
    const bestMarket = variants.reduce((max, v) =>
      v.market != null && v.market > (max ?? -Infinity) ? v.market : max, null)
    if (!variants.length && !bestMarket && !cmPrices) return null
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

async function fetchCardPrices(tcgApiId) {
  if (isPocketCard(tcgApiId)) return null
  // Try pokemontcg.io first
  try {
    const res = await fetch(`${POKEMONTCG_BASE}/cards/${encodeURIComponent(tcgApiId)}`)
    if (res.ok) {
      const json = await res.json()
      const card = json.data
      const tcgPrices = card?.tcgplayer?.prices ?? null
      if (tcgPrices) {
        const variant = tcgPrices.holofoil || tcgPrices.normal || tcgPrices.reverseHolofoil || Object.values(tcgPrices).find(v => v && typeof v === 'object')
        if (variant) {
          return {
            priceLow: variant.low ?? null,
            priceMid: variant.mid ?? null,
            priceMarket: variant.market ?? null,
            priceHigh: variant.high ?? null,
            priceUpdatedAt: new Date().toISOString(),
          }
        }
      }
    }
  } catch { /* fall through */ }
  // Fall back to TCGDex
  try {
    const response = await fetch(`${TCGDEX_BASE}/cards/${encodeURIComponent(tcgApiId)}`)
    if (!response.ok) return null
    const card = await response.json()
    return extractPricing(card)
  } catch {
    return null
  }
}

async function getFullCardPricing(tcgApiId) {
  // Try pokemontcg.io first
  const ptcg = await getPokemonTcgPricing(tcgApiId)
  if (ptcg) return ptcg

  // Fall back to TCGDex
  try {
    const response = await fetch(`${TCGDEX_BASE}/cards/${encodeURIComponent(tcgApiId)}`)
    if (!response.ok) return null
    const card = await response.json()
    const tcgplayer = card.pricing?.tcgplayer ?? null
    const cardmarket = card.pricing?.cardmarket ?? null
    const variants = []
    if (tcgplayer) {
      const variantLabels = { normal: 'Normal', reverseHolo: 'Reverse Holo', holofoil: 'Holofoil', firstEdition: '1st Edition', unlimited: 'Unlimited' }
      for (const [key, label] of Object.entries(variantLabels)) {
        if (tcgplayer[key] && typeof tcgplayer[key] === 'object') {
          const p = tcgplayer[key]
          variants.push({ label, low: p.lowPrice ?? null, mid: p.midPrice ?? null, market: p.marketPrice ?? null, high: p.highPrice ?? null })
        }
      }
    }
    const bestMarket = variants.reduce((max, v) =>
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

  // Save raw count before filtering so hasMore is accurate
  const totalRaw = rawCards.length

  // Filter out TCG Pocket cards (card IDs and set IDs start with "tcgp")
  rawCards = rawCards.filter(card => !isPocketCard(String(card.id || '')))

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

  return { cards, hasMore: totalRaw === PAGE_SIZE }
}

async function getCardPricesBatch(tcgApiIds) {
  const results = await Promise.all(
    tcgApiIds.map(id => getFullCardPricing(id).catch(() => null))
  )
  const map = {}
  tcgApiIds.forEach((id, i) => { map[id] = results[i] })
  return map
}

async function refreshCardPrices(tcgApiId) {
  return fetchCardPrices(tcgApiId)
}

// ─── EUR/USD exchange rate ────────────────────────────────────────────────────

let _eurUsdRate = null

async function fetchEurUsdRate() {
  if (_eurUsdRate !== null) return _eurUsdRate
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error('rate fetch failed')
    const data = await res.json()
    _eurUsdRate = data?.rates?.USD ?? 1.10
  } catch {
    _eurUsdRate = 1.10
  }
  return _eurUsdRate
}

module.exports = { searchCards, refreshCardPrices, fetchCardPrices, getFullCardPricing, getCardPricesBatch, fetchEurUsdRate, isPocketCard }
