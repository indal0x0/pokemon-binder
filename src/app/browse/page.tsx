'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Check, Loader2, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { TcgCardResult, FullCardPricing, CardRow } from '@/types/electron'
import { CardDetailModal } from '@/components/CardDetailModal'

export default function BrowsePage() {
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()
  const binderId = params.get('binderId') ?? ''
  const pageId = params.get('pageId') ?? ''

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TcgCardResult[]>([])
  const [searching, setSearching] = useState(false)
  const [browsePage, setBrowsePage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const currentQueryRef = useRef('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [cardPrices, setCardPrices] = useState<Record<string, FullCardPricing | null | undefined>>({})
  const [filterHasPrice, setFilterHasPrice] = useState(false)
  const [filterNoImage, setFilterNoImage] = useState(false)
  const [filterPocket, setFilterPocket] = useState(false)
  const [sortMode, setSortMode] = useState<'default' | 'newest' | 'oldest' | 'price-high' | 'price-low'>('default')
  const [showSortFilter, setShowSortFilter] = useState(false)
  const [selectedBrowseCard, setSelectedBrowseCard] = useState<TcgCardResult | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const priceTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const loadPage = useCallback(async (q: string, page: number) => {
    if (!q.trim() || q.trim().length < 2 || !window.electronAPI) return
    priceTimeoutsRef.current.forEach(t => clearTimeout(t))
    priceTimeoutsRef.current = []
    setCardPrices({})
    setSearching(true)
    try {
      const { cards, hasMore: more } = await window.electronAPI.searchTcg(q.trim(), page)
      setResults(cards)
      setHasMore(more)
      setBrowsePage(page)
      // Stagger price fetches 100ms apart
      cards.forEach((card, i) => {
        const t = setTimeout(async () => {
          try {
            const prices = await window.electronAPI!.getCardPricesBatch([card.tcgApiId])
            setCardPrices(prev => ({ ...prev, [card.tcgApiId]: prices[card.tcgApiId] ?? null }))
          } catch {
            setCardPrices(prev => ({ ...prev, [card.tcgApiId]: null }))
          }
        }, i * 100)
        priceTimeoutsRef.current.push(t)
      })
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2 || !window.electronAPI) {
      setResults([])
      setCardPrices({})
      setHasMore(false)
      setBrowsePage(1)
      return
    }
    currentQueryRef.current = q.trim()
    await loadPage(q, 1)
  }, [loadPage])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 500)
  }

  async function addCard(card: TcgCardResult) {
    if (!window.electronAPI || !binderId) return
    setAddingId(card.tcgApiId)
    try {
      await window.electronAPI.createCard({
        binderId,
        pageId: pageId || undefined,
        tcgApiId: card.tcgApiId,
        name: card.name,
        setId: card.setId,
        setName: card.setName,
        collectorNumber: card.collectorNumber,
        rarity: card.rarity ?? undefined,
        year: card.year ?? undefined,
        imageUrl: card.imageUrl ?? undefined,
        priceLow: card.priceLow ?? undefined,
        priceMid: card.priceMid ?? undefined,
        priceMarket: card.priceMarket ?? undefined,
        priceHigh: card.priceHigh ?? undefined,
        priceUpdatedAt: card.priceUpdatedAt ?? undefined,
        quantity: 1,
        tradeList: 0,
        condition: null,
      } as Parameters<typeof window.electronAPI.createCard>[0])
      setAddedIds(prev => new Set(prev).add(card.tcgApiId))
      toast.success(`Added ${card.name}`)
    } catch {
      toast.error(`Failed to add ${card.name}`)
    } finally {
      setAddingId(null)
    }
  }

  const backHref = pageId
    ? `/page-detail?id=${pageId}&binderId=${binderId}`
    : binderId
    ? `/binder?id=${binderId}`
    : '/'

  return (
    <div className="min-h-screen">
      <NavBar backHref={backHref} />
      <main className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Card Browser</h1>
        <p className="text-sm text-muted-foreground">Search 20,000+ Pokemon cards</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by card name (e.g. Charizard, Pikachu VMAX)..."
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {!binderId && (
        <div className="mb-4 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400">
          Open the card browser from a binder page to add cards to your collection.
        </div>
      )}

      {results.length > 0 && (
        <div className="mb-4 border rounded-lg px-3 py-2">
          <button
            onClick={() => setShowSortFilter(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Sort &amp; Filter
            {(sortMode !== 'default' || filterHasPrice || filterNoImage || filterPocket) && (
              <span className="ml-1 px-1.5 py-0 rounded-full bg-primary/20 text-primary text-[10px]">active</span>
            )}
          </button>
          {showSortFilter && (
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sort</p>
                <div className="flex flex-wrap gap-1">
                  {(['default', 'newest', 'oldest', 'price-high', 'price-low'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSortMode(mode)}
                      className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                        sortMode === mode
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'border-border/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {{ default: 'Default', newest: 'Newest First', oldest: 'Oldest First', 'price-high': 'Price: High → Low', 'price-low': 'Price: Low → High' }[mode]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Filter</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFilterHasPrice(v => !v)}
                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${filterHasPrice ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground'}`}
                  >
                    Has price
                  </button>
                  <button
                    onClick={() => setFilterNoImage(v => !v)}
                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${filterNoImage ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground'}`}
                  >
                    Has image
                  </button>
                  <button
                    onClick={() => setFilterPocket(v => !v)}
                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${filterPocket ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground'}`}
                  >
                    Hide TCG Pocket
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {results.length === 0 && query.length >= 2 && !searching && (
        <p className="text-center py-16 text-sm text-muted-foreground">No cards found for &quot;{query}&quot;</p>
      )}

      {results.length === 0 && query.length < 2 && !searching && (
        <div className="text-center py-24 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Type at least 2 characters to search</p>
        </div>
      )}

      {results.length > 0 && (() => {
        let displayed = [...results]
        if (filterHasPrice) displayed = displayed.filter(c => {
          const p = cardPrices[c.tcgApiId]
          return p !== undefined && p !== null && (p.bestMarket ?? 0) > 0
        })
        if (filterNoImage) displayed = displayed.filter(c => !!c.imageUrl)
        if (filterPocket) displayed = displayed.filter(c => !c.isPocket)
        switch (sortMode) {
          case 'newest': displayed.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)); break
          case 'oldest': displayed.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999)); break
          case 'price-high': displayed.sort((a, b) => (cardPrices[b.tcgApiId]?.bestMarket ?? b.priceMarket ?? -1) - (cardPrices[a.tcgApiId]?.bestMarket ?? a.priceMarket ?? -1)); break
          case 'price-low': displayed.sort((a, b) => (cardPrices[a.tcgApiId]?.bestMarket ?? a.priceMarket ?? 99999) - (cardPrices[b.tcgApiId]?.bestMarket ?? b.priceMarket ?? 99999)); break
        }
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayed.map(card => {
              const added = addedIds.has(card.tcgApiId)
              const adding = addingId === card.tcgApiId
              const fetchedPricing = cardPrices[card.tcgApiId]
              const priceLoading = fetchedPricing === undefined
              const displayPrice = fetchedPricing?.bestMarket ?? card.priceMarket
              return (
                <div key={card.tcgApiId} className="relative bg-card border rounded-lg overflow-hidden">
                  <div className="cursor-pointer" onClick={() => setSelectedBrowseCard(card)}>
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.imageUrl} alt={card.name} className="w-full aspect-[2.5/3.5] object-cover hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="w-full aspect-[2.5/3.5] bg-secondary flex items-center justify-center">
                      <span className="text-xs text-muted-foreground text-center px-2">{card.name}</span>
                    </div>
                  )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium leading-tight truncate">{card.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{card.setName}</p>
                    {card.collectorNumber && (
                      <p className="text-xs text-muted-foreground">#{card.collectorNumber}</p>
                    )}
                    <div className="flex items-center justify-between mt-1.5 gap-1">
                      {priceLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/40" />
                      ) : (
                        <p className="text-sm font-semibold text-primary">
                          {displayPrice ? formatCurrency(displayPrice) : '—'}
                        </p>
                      )}
                      {card.rarity && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 truncate max-w-16">{card.rarity}</Badge>
                      )}
                    </div>
                    {binderId && (
                      <Button
                        size="sm"
                        variant={added ? 'secondary' : 'outline'}
                        className="w-full mt-2 h-7 text-xs"
                        onClick={() => !added && addCard(card)}
                        disabled={adding || added}
                      >
                        {adding ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : added ? (
                          <><Check className="h-3 w-3 mr-1" /> Added</>
                        ) : (
                          <><Plus className="h-3 w-3 mr-1" /> Add to Binder</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {(browsePage > 1 || hasMore) && (
        <div className="flex items-center justify-between mt-6 px-2">
          <button
            onClick={() => loadPage(currentQueryRef.current, browsePage - 1)}
            disabled={browsePage === 1 || searching}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {browsePage}</span>
          <button
            onClick={() => loadPage(currentQueryRef.current, browsePage + 1)}
            disabled={!hasMore || searching}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </main>

    {selectedBrowseCard && (
      <CardDetailModal
        readOnly
        card={{
          id: '',
          binderId: '',
          pageId: null,
          tcgApiId: selectedBrowseCard.tcgApiId,
          name: selectedBrowseCard.name,
          setId: selectedBrowseCard.setId,
          setName: selectedBrowseCard.setName,
          collectorNumber: selectedBrowseCard.collectorNumber,
          rarity: selectedBrowseCard.rarity ?? null,
          imageUrl: selectedBrowseCard.imageUrl ?? null,
          year: selectedBrowseCard.year ?? null,
          priceLow: selectedBrowseCard.priceLow ?? null,
          priceMid: selectedBrowseCard.priceMid ?? null,
          priceMarket: selectedBrowseCard.priceMarket ?? null,
          priceHigh: selectedBrowseCard.priceHigh ?? null,
          priceBase: null,
          priceUpdatedAt: selectedBrowseCard.priceUpdatedAt ?? null,
          quantity: 1,
          condition: null,
          tradeList: 0,
          position: null,
          purchasedPrice: null,
          createdAt: '',
          updatedAt: '',
        } satisfies CardRow}
        onClose={() => setSelectedBrowseCard(null)}
        onCardUpdated={() => {}}
      />
    )}
    </div>
  )
}
