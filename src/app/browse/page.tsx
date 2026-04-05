'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Search, Plus, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { TcgCardResult, PageRow, FullCardPricing } from '@/types/electron'

export default function BrowsePage() {
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()
  const binderId = params.get('binderId') ?? ''
  const pageId = params.get('pageId') ?? ''

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TcgCardResult[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [cardPrices, setCardPrices] = useState<Record<string, FullCardPricing | null | undefined>>({})
  const [filterHasPrice, setFilterHasPrice] = useState(false)
  const [conditionById, setConditionById] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const priceTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2 || !window.electronAPI) {
      setResults([])
      setCardPrices({})
      return
    }
    // Clear any pending price fetches from previous search
    priceTimeoutsRef.current.forEach(t => clearTimeout(t))
    priceTimeoutsRef.current = []
    setCardPrices({})
    setSearching(true)
    try {
      const { cards } = await window.electronAPI.searchTcg(q.trim())
      setResults(cards)
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
        condition: conditionById[card.tcgApiId] || null,
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
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Card Browser</h1>
          <p className="text-sm text-muted-foreground">Search 20,000+ Pokemon cards</p>
        </div>
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
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setFilterHasPrice(v => !v)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
              filterHasPrice
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            Has price
          </button>
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
        const displayed = filterHasPrice
          ? results.filter(c => {
              const p = cardPrices[c.tcgApiId]
              return p !== undefined && p !== null && (p.bestMarket ?? 0) > 0
            })
          : results
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
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.imageUrl} alt={card.name} className="w-full aspect-[2.5/3.5] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2.5/3.5] bg-secondary flex items-center justify-center">
                      <span className="text-xs text-muted-foreground text-center px-2">{card.name}</span>
                    </div>
                  )}
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
                    <select
                      value={conditionById[card.tcgApiId] ?? ''}
                      onChange={e => setConditionById(prev => ({ ...prev, [card.tcgApiId]: e.target.value }))}
                      className="w-full mt-1 text-[10px] px-1 py-0.5 rounded border border-border bg-background text-foreground"
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="">— Condition —</option>
                      <option value="NM">NM</option>
                      <option value="LP">LP</option>
                      <option value="MP">MP</option>
                      <option value="HP">HP</option>
                      <option value="DMG">DMG</option>
                    </select>
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
    </main>
  )
}
