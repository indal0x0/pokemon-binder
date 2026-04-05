/**
 * TCGPlayer price scraper — uses the same JSON API that tcgplayer.com calls internally.
 * No API key required; plain fetch from the Electron main process.
 */

const SEARCH_URL = 'https://mp-search-api.tcgplayer.com/v1/search/request'
const TTL = 24 * 60 * 60 * 1000  // 24 hours
const RATE_MS = 400               // delay between requests

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchTCGPlayerPrice(name, setName) {
  try {
    const body = JSON.stringify({
      algorithm: 'sales_synonym_v2',
      from: 0,
      size: 1,
      filters: {
        term: {
          productLineName: ['pokemon'],
          ...(setName ? { setName: [setName] } : {}),
        },
        range: {},
        match: {},
      },
      listingSearch: {
        filters: { term: {}, range: {}, match: {} },
      },
      context: { shippingCountry: 'US', cart: {} },
      settings: { useFuzzySearch: true },
      sort: {},
      aggregations: ['listingType'],
      query: name,
    })

    const resp = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin': 'https://www.tcgplayer.com',
        'Referer': 'https://www.tcgplayer.com/',
      },
      body,
    })

    if (!resp.ok) return null
    const data = await resp.json()
    const result = data?.results?.[0]?.results?.[0]
    if (!result) return null

    const market = result.marketPrice ?? null
    const low = result.lowPrice ?? null
    const high = result.highPrice ?? null
    if (market == null && low == null) return null
    return { market, low, high }
  } catch {
    return null
  }
}

async function scrapeBatchPrices(store, cards) {
  const cache = store.get('tcgp_price_cache', {})
  const now = Date.now()
  const stale = cards.filter(c => !cache[c.tcgApiId] || now - cache[c.tcgApiId].ts > TTL)
  let updated = 0

  for (const card of stale) {
    try {
      const price = await fetchTCGPlayerPrice(card.name, card.setName)
      if (price) {
        cache[card.tcgApiId] = { ...price, ts: now }
        updated++
      }
    } catch {
      // ignore per-card failures
    }
    await sleep(RATE_MS)
  }

  if (updated > 0) {
    store.set('tcgp_price_cache', cache)
  }

  return { updated, skipped: cards.length - stale.length }
}

module.exports = { scrapeBatchPrices }
