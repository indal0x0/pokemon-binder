/**
 * cardboard2.com API client for One Piece TCG pricing and card details.
 * Free, no API key required. All 3,400+ cards are returned in one request.
 */

const CB2_URL = 'https://cardboard2.com/api/cards'

// In-process card data cache (one fetch per app session)
let _cache = null   // flat array of all card objects
let _fetchPromise = null

async function _loadData() {
  if (_fetchPromise) return _fetchPromise
  _fetchPromise = (async () => {
    const res = await fetch(CB2_URL, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`cardboard2 API returned ${res.status}`)
    const data = await res.json()
    const flat = []
    for (const cards of Object.values(data.cardsBySet || {})) {
      for (const c of cards) flat.push(c)
    }
    _cache = flat
    return flat
  })()
  return _fetchPromise
}

/**
 * Parse a One Piece tcgApiId into its serial and optional variant stem.
 * e.g. "OP01-024" → { serial: "OP01-024", stem: null }
 *      "OP01-024::OP01-024_p1" → { serial: "OP01-024", stem: "OP01-024_p1" }
 */
function parseId(tcgApiId) {
  const parts = tcgApiId.split('::')
  return { serial: parts[0], stem: parts[1] ?? null }
}

/**
 * Find the best-matching cardboard2 card for a given tcgApiId.
 * When multiple variants share the same card_serial, match by image filename stem.
 */
function findCard(allCards, tcgApiId) {
  const { serial, stem } = parseId(tcgApiId)
  const matches = allCards.filter(c => c.card_serial === serial)
  if (matches.length === 0) return null
  if (matches.length === 1 || !stem) return matches[0]
  // Try to match variant by image filename (e.g. "OP01-024_p1.png")
  const byImage = matches.find(c => {
    const fn = (c.image_filename || '').replace(/\.[^.]+$/, '')
    const url = (c.limitlesstcg_image_url || '').split('/').pop()?.replace(/\.[^.]+$/, '') || ''
    return fn === stem || url === stem
  })
  return byImage ?? matches[0]
}

/**
 * Look up price and card details for a One Piece card by its tcgApiId.
 * Returns null if the card is not found in the cache.
 */
async function lookupOpCard(tcgApiId) {
  try {
    const allCards = await _loadData()
    const card = findCard(allCards, tcgApiId)
    if (!card) return null
    return {
      priceMarket: card.current_price ? parseFloat(card.current_price) : null,
      priceLow: card.value_amount ? parseFloat(card.value_amount) : null,
      // Card details
      card_effect: card.card_effect || null,
      cost: card.cost || null,
      power: card.power || null,
      attributes: card.attributes || null,
      counter: card.counter || null,
      card_type: card.type || null,
      tcgplayer_url: card.tcgplayer_url || null,
      abilities: Array.isArray(card.abilities) ? card.abilities : [],
    }
  } catch {
    return null
  }
}

/**
 * Refresh prices for a list of One Piece binder cards.
 * Returns array of { id, priceMarket, priceLow } for cards that found a price.
 */
async function refreshOpPrices(binderCards) {
  const allCards = await _loadData()
  const updates = []
  for (const bc of binderCards) {
    const card = findCard(allCards, bc.tcgApiId)
    if (!card) continue
    const priceMarket = card.current_price ? parseFloat(card.current_price) : null
    const priceLow = card.value_amount ? parseFloat(card.value_amount) : null
    if (priceMarket !== null || priceLow !== null) {
      updates.push({ id: bc.id, priceMarket, priceLow })
    }
  }
  return updates
}

module.exports = { lookupOpCard, refreshOpPrices }
