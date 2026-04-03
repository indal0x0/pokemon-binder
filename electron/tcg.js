/**
 * TCGDex API client for the Electron main process.
 * Free, no API key required. No price data available.
 */

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en'

async function searchCards(query) {
  if (!query || query.trim().length < 2) return []

  const url = `${TCGDEX_BASE}/cards?name=${encodeURIComponent(query.trim())}&pagination:itemsPerPage=24`

  let cards
  try {
    const response = await fetch(url)
    if (!response.ok) return []
    cards = await response.json()
    if (!Array.isArray(cards)) return []
  } catch {
    return []
  }

  return cards.map(card => {
    // Card IDs follow the format {setId}-{localId} e.g. "swsh3-136"
    const lastDash = (card.id || '').lastIndexOf('-')
    const setId = lastDash > 0 ? card.id.slice(0, lastDash) : 'unknown'
    const imageUrl = card.image ? `${card.image}/high.png` : null

    return {
      tcgApiId: card.id || `unknown-${Math.random().toString(36).slice(2)}`,
      name: card.name || 'Unknown Card',
      setId,
      setName: setId,
      collectorNumber: String(card.localId || ''),
      rarity: null,
      imageUrl,
      priceLow: null,
      priceMid: null,
      priceMarket: null,
      priceHigh: null,
      priceUpdatedAt: null,
    }
  })
}

// Stub — AI scanning is disabled (Coming Soon)
async function matchCard() {
  return null
}

// Stub — TCGDex has no price data
async function refreshCardPrices() {
  return null
}

module.exports = { matchCard, searchCards, refreshCardPrices }
