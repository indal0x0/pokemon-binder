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
 * When multiple variants share the same card_serial, tries three tiebreakers
 * in order before falling back to the first match:
 *   1. Stored imageUrl stem — unique per art, most direct link to cardboard2 filename
 *   2. tcgApiId variant stem — works when makeOnePieceId encoded a suffix
 *   3. Card name — for genuinely different-named cards sharing a serial
 *
 * cardboard2 image filenames include a language suffix (_EN, _JP, …) that the
 * optcg API image stems do not, so all stems are normalized before comparison.
 */
function findCard(allCards, tcgApiId, name, imageUrl) {
  const { serial, stem } = parseId(tcgApiId)
  const matches = allCards.filter(c => c.card_serial === serial)

  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]

  // Strip trailing language code (_EN, _JP, _KR, …) for language-agnostic comparison
  const normStem = s => (s || '').replace(/_[A-Z]{2}$/, '')

  function imageStem(c) {
    const fromFilename = (c.image_filename || '').replace(/\.[^.]+$/, '')
    if (fromFilename) return fromFilename
    return (c.limitlesstcg_image_url || '').split('/').pop()?.replace(/\.[^.]+$/, '') || ''
  }

  // Tiebreaker 1: stored imageUrl stem (skip local upload paths)
  if (imageUrl && !imageUrl.startsWith('uploads/')) {
    const urlStem = imageUrl.split('/').pop()?.replace(/\.[^.]+$/, '') || ''
    if (urlStem) {
      const byUrl = matches.find(c => normStem(imageStem(c)) === normStem(urlStem))
      if (byUrl) return byUrl
    }
  }

  // Tiebreaker 2: tcgApiId variant stem
  if (stem) {
    const byImage = matches.find(c => normStem(imageStem(c)) === normStem(stem))
    if (byImage) return byImage
  } else {
    const base = matches.find(c => normStem(imageStem(c)) === normStem(serial))
    if (base) return base
  }

  // Tiebreaker 3: card name
  if (name) {
    const normalize = s => (s || '').toLowerCase().trim()
    const byName = matches.find(c => normalize(c.card_name) === normalize(name))
    if (byName) return byName
  }

  return matches[0]
}

/**
 * Look up price and card details for a One Piece card by its tcgApiId.
 * Returns null if the card is not found in the cache.
 */
async function lookupOpCard(tcgApiId, name, imageUrl) {
  try {
    const allCards = await _loadData()
    const card = findCard(allCards, tcgApiId, name, imageUrl)
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

module.exports = { lookupOpCard, refreshOpPrices }
