/**
 * Pokemon TCG API client for the Electron main process.
 * Matches identified cards to TCG database entries and fetches prices.
 */

const TCG_BASE = 'https://api.pokemontcg.io/v2'

async function tcgFetch(url, apiKey) {
  const headers = {}
  if (apiKey) headers['X-Api-Key'] = apiKey

  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`TCG API error ${response.status}: ${url}`)
  }
  return response.json()
}

function buildQuery(params) {
  const parts = []
  for (const [key, value] of Object.entries(params)) {
    if (value) parts.push(`${key}:"${value.replace(/"/g, '\\"')}"`)
  }
  return parts.join(' ')
}

function extractBestPrice(card, notes) {
  const prices = card.tcgplayer?.prices
  if (!prices) return null

  const n = (notes || '').toLowerCase()
  const isHolo = n.includes('holo') && !n.includes('reverse')
  const isReverse = n.includes('reverse')
  const is1st = n.includes('1st edition') || n.includes('first edition')

  let variant = null
  if (is1st && prices['1stEditionHolofoil']) variant = '1stEditionHolofoil'
  else if (is1st && prices['1stEdition']) variant = '1stEdition'
  else if (isHolo && prices.holofoil) variant = 'holofoil'
  else if (isReverse && prices.reverseHolofoil) variant = 'reverseHolofoil'
  else if (prices.normal) variant = 'normal'
  else if (prices.holofoil) variant = 'holofoil'
  else variant = Object.keys(prices)[0]

  if (!variant) return null
  const p = prices[variant]
  return {
    priceLow: p.low ?? null,
    priceMid: p.mid ?? null,
    priceMarket: p.market ?? null,
    priceHigh: p.high ?? null,
  }
}

async function matchCard(identified, apiKey) {
  const { name, setName, collectorNumber, notes } = identified

  // Attempt 1: name + collector number
  if (name && collectorNumber) {
    try {
      const q = buildQuery({ name, number: collectorNumber })
      const data = await tcgFetch(`${TCG_BASE}/cards?q=${encodeURIComponent(q)}&pageSize=5`, apiKey)
      if (data.data?.length > 0) {
        const card = data.data[0]
        return buildResult(card, notes)
      }
    } catch { /* fall through */ }
  }

  // Attempt 2: name + set name
  if (name && setName) {
    try {
      const q = buildQuery({ name, 'set.name': setName })
      const data = await tcgFetch(`${TCG_BASE}/cards?q=${encodeURIComponent(q)}&pageSize=5`, apiKey)
      if (data.data?.length > 0) {
        const card = data.data[0]
        return buildResult(card, notes)
      }
    } catch { /* fall through */ }
  }

  // Attempt 3: name only, sorted by highest market price
  if (name) {
    try {
      const q = buildQuery({ name })
      const data = await tcgFetch(
        `${TCG_BASE}/cards?q=${encodeURIComponent(q)}&pageSize=20&orderBy=-tcgplayer.prices.holofoil.market`,
        apiKey,
      )
      if (data.data?.length > 0) {
        // Pick the card with highest market price
        let best = data.data[0]
        let bestPrice = 0
        for (const c of data.data) {
          const prices = c.tcgplayer?.prices
          if (!prices) continue
          const market = Object.values(prices).find((p) => p?.market)?.market || 0
          if (market > bestPrice) {
            bestPrice = market
            best = c
          }
        }
        return buildResult(best, notes)
      }
    } catch { /* fall through */ }
  }

  return null
}

function buildResult(card, notes) {
  const priceData = extractBestPrice(card, notes)
  return {
    tcgApiId: card.id,
    name: card.name,
    setId: card.set?.id || 'unknown',
    setName: card.set?.name || 'Unknown Set',
    collectorNumber: card.number || '',
    rarity: card.rarity || null,
    imageUrl: card.images?.small || null,
    priceLow: priceData?.priceLow ?? null,
    priceMid: priceData?.priceMid ?? null,
    priceMarket: priceData?.priceMarket ?? null,
    priceHigh: priceData?.priceHigh ?? null,
    priceUpdatedAt: priceData ? new Date().toISOString() : null,
  }
}

async function searchCards(query, apiKey) {
  if (!query || query.trim().length < 2) return []
  const q = `name:"${query.replace(/"/g, '\\"')}*"`
  const data = await tcgFetch(
    `${TCG_BASE}/cards?q=${encodeURIComponent(q)}&pageSize=30&orderBy=name`,
    apiKey,
  )
  return (data.data || []).map((card) => ({
    tcgApiId: card.id,
    name: card.name,
    setId: card.set?.id || 'unknown',
    setName: card.set?.name || 'Unknown Set',
    collectorNumber: card.number || '',
    rarity: card.rarity || null,
    imageUrl: card.images?.small || null,
    ...extractBestPrice(card, null),
    priceUpdatedAt: new Date().toISOString(),
  }))
}

async function refreshCardPrices(tcgApiId, notes, apiKey) {
  const data = await tcgFetch(`${TCG_BASE}/cards/${encodeURIComponent(tcgApiId)}`, apiKey)
  const card = data.data
  if (!card) return null
  const priceData = extractBestPrice(card, notes)
  if (!priceData) return null
  return { ...priceData, priceUpdatedAt: new Date().toISOString() }
}

module.exports = { matchCard, searchCards, refreshCardPrices }
