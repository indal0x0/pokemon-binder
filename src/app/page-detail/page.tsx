'use client'

import { Suspense } from 'react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, X, Check, Loader2, LayoutGrid, ChevronRight, Trash2, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import type { CardRow, TcgCardResult, FullCardPricing } from '@/types/electron'
import { CardDetailModal } from '@/components/CardDetailModal'
import { formatCurrency } from '@/lib/utils'

const DIMENSION_PRESETS = [
  { label: '1×1', cols: 1, rows: 1 },
  { label: '2×1', cols: 2, rows: 1 },
  { label: '2×2', cols: 2, rows: 2 },
  { label: '3×3', cols: 3, rows: 3 },
  { label: '3×4', cols: 3, rows: 4 },
  { label: '4×4', cols: 4, rows: 4 },
]

type SortMode = 'default' | 'newest' | 'oldest' | 'price-high' | 'price-low'

interface PageData {
  id: string
  binderId: string
  name: string
  pageNumber: number
  cols: number
  rows: number
  status: string
  cards: CardRow[]
}

function PageDetailInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pageId = searchParams.get('id') ?? ''
  const binderId = searchParams.get('binderId') ?? ''

  const [page, setPage] = useState<PageData | null>(null)
  const [binderName, setBinderName] = useState('')
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)

  // Card detail modal
  const [selectedCard, setSelectedCard] = useState<CardRow | null>(null)

  // Slide-in card search panel
  const [panelOpen, setPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TcgCardResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [searchPrices, setSearchPrices] = useState<Record<string, FullCardPricing | null>>({})
  const [fetchingPrices, setFetchingPrices] = useState(false)

  // Search panel sort + filter
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [filterUnpriced, setFilterUnpriced] = useState(false)
  const [filterNoImage, setFilterNoImage] = useState(false)
  const [showSortFilter, setShowSortFilter] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentQueryRef = useRef('')

  // Edit dimensions dialog
  const [editDimsOpen, setEditDimsOpen] = useState(false)
  const [dimsPreset, setDimsPreset] = useState('3×3')
  const [dimsCustomCols, setDimsCustomCols] = useState(3)
  const [dimsCustomRows, setDimsCustomRows] = useState(3)
  const [savingDims, setSavingDims] = useState(false)

  // Drag-and-drop
  const dragFromIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // ─── Load page ───────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!pageId || !window.electronAPI) return
    try {
      const data = await window.electronAPI.getPage(pageId)
      if (!data) { router.push('/'); return }
      setPage(data as PageData)
      setCards(data.cards ?? [])
      setLoading(false)
      // Fetch binder name for breadcrumb
      const bid = data.binderId
      if (bid) {
        window.electronAPI.getBinder(bid)
          .then(b => { if (b) setBinderName(b.name) })
          .catch(() => {})
      }
    } catch {
      setLoading(false)
    }
  }, [pageId, router])

  useEffect(() => {
    if (pageId) load()
  }, [pageId, load])

  // ─── Card search panel ───────────────────────────────────────────────────────

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2 || !window.electronAPI) {
      setSearchResults([])
      setHasMore(false)
      setSearchPage(1)
      return
    }
    currentQueryRef.current = q.trim()
    setSearching(true)
    setSearchPage(1)
    setSearchPrices({})
    try {
      const { cards, hasMore: more } = await window.electronAPI.searchTcg(q.trim(), 1)
      setSearchResults(cards)
      setHasMore(more)
      // Fetch prices for all results in parallel
      if (cards.length > 0) {
        setFetchingPrices(true)
        window.electronAPI.getCardPricesBatch(cards.map(c => c.tcgApiId))
          .then(prices => setSearchPrices(prices))
          .catch(() => {})
          .finally(() => setFetchingPrices(false))
      }
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }, [])

  async function loadMore() {
    if (!window.electronAPI || loadingMore) return
    const nextPage = searchPage + 1
    setLoadingMore(true)
    try {
      const { cards, hasMore: more } = await window.electronAPI.searchTcg(currentQueryRef.current, nextPage)
      setSearchResults(prev => [...prev, ...cards])
      setHasMore(more)
      setSearchPage(nextPage)
    } catch {
      toast.error('Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 400)
  }

  function toggleCardSelection(tcgApiId: string) {
    setSelectedCards(prev => {
      const next = new Set(prev)
      if (next.has(tcgApiId)) next.delete(tcgApiId)
      else next.add(tcgApiId)
      return next
    })
  }

  async function addSelectedCards() {
    if (!window.electronAPI || selectedCards.size === 0 || !page) return
    setAdding(true)
    const toAdd = searchResults.filter(c => selectedCards.has(c.tcgApiId))
    let nextPos = cards.length
    try {
      for (const card of toAdd) {
        await window.electronAPI.createCard({
          binderId,
          pageId,
          tcgApiId: card.tcgApiId,
          name: card.name,
          setId: card.setId,
          setName: card.setName,
          collectorNumber: card.collectorNumber,
          rarity: card.rarity ?? undefined,
          year: card.year ?? undefined,
          imageUrl: card.imageUrl ?? undefined,
          quantity: 1,
          tradeList: 0,
          position: nextPos++,
        } as Parameters<typeof window.electronAPI.createCard>[0])
      }
      toast.success(`Added ${toAdd.length} card${toAdd.length !== 1 ? 's' : ''}`)
      setSelectedCards(new Set())
      setPanelOpen(false)
      setSearchQuery('')
      setSearchResults([])
      await load()
    } catch {
      toast.error('Failed to add cards')
    } finally {
      setAdding(false)
    }
  }

  async function deleteCard(cardId: string) {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.deleteCard(cardId)
      setCards(prev => prev.filter(c => c.id !== cardId))
    } catch {
      toast.error('Failed to delete card')
    }
  }

  // ─── Drag-and-drop ───────────────────────────────────────────────────────────

  function onDragStart(e: React.DragEvent, slotIdx: number) {
    dragFromIdx.current = slotIdx
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, slotIdx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(slotIdx)
  }

  function onDragLeave() {
    setDragOverIdx(null)
  }

  function onDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault()
    setDragOverIdx(null)
    const fromIdx = dragFromIdx.current
    dragFromIdx.current = null

    if (fromIdx === null || fromIdx === toIdx || fromIdx >= cards.length) return

    const newCards = [...cards]
    const [moved] = newCards.splice(fromIdx, 1)
    const insertAt = Math.min(toIdx, newCards.length)
    newCards.splice(insertAt, 0, moved)
    setCards(newCards)

    const positions = newCards.map((card, idx) => ({ id: card.id, position: idx }))
    window.electronAPI?.reorderPageCards(pageId, positions).catch(() => {
      toast.error('Failed to save card order')
      setCards(cards)
    })
  }

  function onDragEnd() {
    dragFromIdx.current = null
    setDragOverIdx(null)
  }

  // ─── Edit dimensions ─────────────────────────────────────────────────────────

  function openEditDims() {
    if (!page) return
    const currentLabel = `${page.cols}×${page.rows}`
    const matchesPreset = DIMENSION_PRESETS.some(p => p.label === currentLabel)
    setDimsPreset(matchesPreset ? currentLabel : 'Custom')
    setDimsCustomCols(page.cols)
    setDimsCustomRows(page.rows)
    setEditDimsOpen(true)
  }

  const editDims = dimsPreset === 'Custom'
    ? { cols: Math.max(1, dimsCustomCols), rows: Math.max(1, dimsCustomRows) }
    : DIMENSION_PRESETS.find(p => p.label === dimsPreset) ?? { cols: 3, rows: 3 }

  const overflowCount = Math.max(0, cards.length - editDims.cols * editDims.rows)

  async function saveDimensions() {
    if (!window.electronAPI || !page) return
    setSavingDims(true)
    try {
      const newCols = editDims.cols
      const newRows = editDims.rows
      const capacity = newCols * newRows
      const overflow = cards.slice(capacity)
      const keep = cards.slice(0, capacity)

      await window.electronAPI.updatePage(pageId, { cols: newCols, rows: newRows })

      if (overflow.length > 0) {
        let batch = overflow
        while (batch.length > 0) {
          const chunk = batch.slice(0, capacity)
          batch = batch.slice(capacity)
          const newPage = await window.electronAPI.createPage({
            binderId,
            name: `${page.name} (cont.)`,
            cols: newCols,
            rows: newRows,
          })
          await window.electronAPI.moveCardsToPage(chunk.map(c => c.id), newPage.id)
        }
        toast.success(`Dimensions updated. ${overflow.length} card${overflow.length !== 1 ? 's' : ''} moved to new page${overflowCount > capacity ? 's' : ''}.`)
      } else {
        toast.success('Dimensions updated')
      }

      setPage(prev => prev ? { ...prev, cols: newCols, rows: newRows } : null)
      setCards(keep)
      setEditDimsOpen(false)
    } catch {
      toast.error('Failed to update dimensions')
    } finally {
      setSavingDims(false)
    }
  }

  // ─── Search results: sort + filter ───────────────────────────────────────────

  const displayedResults = (() => {
    let results = [...searchResults]
    if (filterUnpriced) results = results.filter(c => {
      const market = searchPrices[c.tcgApiId]?.bestMarket ?? c.priceMarket
      return market && market > 0
    })
    if (filterNoImage) results = results.filter(c => !!c.imageUrl)
    switch (sortMode) {
      case 'newest': results.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)); break
      case 'oldest': results.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999)); break
      case 'price-high':
        results.sort((a, b) =>
          (searchPrices[b.tcgApiId]?.bestMarket ?? b.priceMarket ?? -1) -
          (searchPrices[a.tcgApiId]?.bestMarket ?? a.priceMarket ?? -1))
        break
      case 'price-low':
        results.sort((a, b) =>
          (searchPrices[a.tcgApiId]?.bestMarket ?? a.priceMarket ?? 99999) -
          (searchPrices[b.tcgApiId]?.bestMarket ?? b.priceMarket ?? 99999))
        break
    }
    return results
  })()

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading || !pageId) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
  }
  if (!page) return null

  const cols = page.cols ?? 3
  const rows = page.rows ?? 3
  const totalSlots = cols * rows

  // Use page.binderId as fallback if URL param wasn't captured yet
  const slots: (CardRow | null)[] = Array(totalSlots).fill(null)
  cards.forEach((card, i) => {
    if (i < totalSlots) slots[i] = card
  })

  const sortLabels: Record<SortMode, string> = {
    default: 'Default',
    newest: 'Newest First',
    oldest: 'Oldest First',
    'price-high': 'Price: High → Low',
    'price-low': 'Price: Low → High',
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background z-10 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Binders</Link>
          <span className="opacity-40">›</span>
          <Link
            href={`/binder?id=${page?.binderId || binderId}`}
            className="hover:text-foreground transition-colors truncate max-w-32"
          >
            {binderName || '…'}
          </Link>
          <span className="opacity-40">›</span>
          <span className="text-foreground/70 truncate">{page.name}</span>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-2 flex items-center gap-3">
          <h1 className="font-semibold flex-1 truncate">{page.name}</h1>
          <button
            onClick={openEditDims}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1 transition-colors"
          >
            <LayoutGrid className="h-3 w-3" />
            {cols}×{rows}
          </button>
          <Button size="sm" onClick={() => setPanelOpen(true)}>
            Add Cards
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden max-w-6xl mx-auto w-full px-6 py-4 flex flex-col">
        {cards.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm mb-4">No cards on this page yet.</p>
            <Button onClick={() => setPanelOpen(true)}>
              <Search className="h-4 w-4 mr-2" />
              Add Cards
            </Button>
          </div>
        ) : (
          <div
            className="flex-1 grid gap-1.5 overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {slots.map((card, slotIdx) => (
              <div
                key={slotIdx}
                className={`relative rounded-lg border-2 overflow-hidden transition-colors ${
                  dragOverIdx === slotIdx
                    ? 'border-primary bg-primary/5'
                    : card
                    ? 'border-border bg-card'
                    : 'border-dashed border-border/40 bg-muted/20'
                }`}
                onDragOver={e => onDragOver(e, slotIdx)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, slotIdx)}
              >
                {card ? (
                  <div
                    draggable
                    onDragStart={e => onDragStart(e, slotIdx)}
                    onDragEnd={onDragEnd}
                    className="w-full h-full cursor-grab active:cursor-grabbing group"
                  >
                    {card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          card.imageUrl.startsWith('uploads/')
                            ? window.electronAPI?.getImageUrl(card.imageUrl) ?? card.imageUrl
                            : card.imageUrl
                        }
                        alt={card.name}
                        className="w-full h-full object-contain select-none pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2 bg-secondary">
                        <span className="text-xs text-muted-foreground text-center leading-tight">{card.name}</span>
                      </div>
                    )}
                    {/* Hover overlay — click to open detail */}
                    <div
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end opacity-0 group-hover:opacity-100 cursor-pointer"
                      onClick={() => setSelectedCard(card)}
                    >
                      <div className="w-full px-1.5 pb-1.5 pt-4 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-[10px] font-semibold leading-tight drop-shadow line-clamp-2">{card.name}</p>
                        {card.collectorNumber && (
                          <p className="text-white/70 text-[9px] leading-tight drop-shadow">#{card.collectorNumber}</p>
                        )}
                        {card.setName && (
                          <p className="text-white/60 text-[9px] leading-tight drop-shadow truncate">{card.setName}</p>
                        )}
                        {card.priceMarket && (
                          <p className="text-white/90 text-[10px] font-semibold leading-tight drop-shadow mt-0.5">{formatCurrency(card.priceMarket)}</p>
                        )}
                      </div>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteCard(card.id) }}
                      className="absolute top-1 right-1 bg-background/80 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card detail modal */}
      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onCardUpdated={updated => {
          setSelectedCard(updated)
          setCards(prev => prev.map(c => c.id === updated.id ? updated : c))
        }}
      />

      {/* Slide-in card search panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setPanelOpen(false)} />
          <div className="relative w-96 h-full bg-background border-l flex flex-col shadow-xl">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-semibold text-sm">Add Cards</h2>
              <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search input */}
            <div className="px-3 py-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Sort + filter controls */}
            {searchResults.length > 0 && (
              <div className="px-3 py-2 border-b">
                <button
                  onClick={() => setShowSortFilter(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Sort & Filter
                  {(sortMode !== 'default' || filterUnpriced || filterNoImage) && (
                    <span className="ml-1 px-1.5 py-0 rounded-full bg-primary/20 text-primary text-[10px]">active</span>
                  )}
                </button>
                {showSortFilter && (
                  <div className="mt-2 space-y-2">
                    {/* Sort */}
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sort</p>
                      <div className="flex flex-wrap gap-1">
                        {(Object.keys(sortLabels) as SortMode[]).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setSortMode(mode)}
                            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                              sortMode === mode
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'border-border/50 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {sortLabels[mode]}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Filters */}
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Filter</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setFilterUnpriced(v => !v)}
                          className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                            filterUnpriced ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Has price
                        </button>
                        <button
                          onClick={() => setFilterNoImage(v => !v)}
                          className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                            filterNoImage ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Has image
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50">{displayedResults.length} of {searchResults.length} shown</p>
                  </div>
                )}
              </div>
            )}

            {/* Results list */}
            <div className="flex-1 overflow-y-auto">
              {searchResults.length === 0 && searchQuery.length < 2 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-xs">Type at least 2 characters to search</p>
                </div>
              )}
              {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-xs">No results for &quot;{searchQuery}&quot;</p>
                </div>
              )}
              {searching && searchResults.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
                  <p className="text-xs">Searching...</p>
                </div>
              )}
              {displayedResults.map(card => {
                const selected = selectedCards.has(card.tcgApiId)
                return (
                  <button
                    key={card.tcgApiId}
                    onClick={() => toggleCardSelection(card.tcgApiId)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/30 text-left ${
                      selected ? 'bg-primary/5' : ''
                    }`}
                  >
                    {card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-20 h-28 object-cover rounded-md flex-shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-secondary rounded-md flex-shrink-0 flex items-center justify-center shadow-sm">
                        <span className="text-[9px] text-muted-foreground text-center px-1 leading-tight">{card.name}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{card.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {card.setName || card.setId}{card.year ? ` · ${card.year}` : ''}
                      </p>
                      {card.collectorNumber && (
                        <p className="text-xs text-muted-foreground/60">#{card.collectorNumber}</p>
                      )}
                      {(() => {
                        const fetched = searchPrices[card.tcgApiId]
                        const market = fetched?.bestMarket ?? card.priceMarket
                        if (fetchingPrices && fetched === undefined) {
                          return <p className="text-xs text-muted-foreground/40 mt-1 flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />Fetching...</p>
                        }
                        return market
                          ? <p className="text-xs font-semibold text-primary mt-1">{formatCurrency(market)}</p>
                          : <p className="text-xs text-muted-foreground/40 mt-1">No price</p>
                      })()}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      selected ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </button>
                )
              })}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
                >
                  {loadingMore ? <><Loader2 className="h-3 w-3 animate-spin" />Loading...</> : 'Load more results'}
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-3 border-t bg-background">
              <Button
                className="w-full"
                disabled={selectedCards.size === 0 || adding}
                onClick={addSelectedCards}
              >
                {adding ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Adding...</>
                ) : selectedCards.size === 0 ? (
                  'Select cards to add'
                ) : (
                  `Add ${selectedCards.size} Card${selectedCards.size !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit dimensions dialog */}
      <Dialog open={editDimsOpen} onOpenChange={open => !open && setEditDimsOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Grid Size</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Grid size</Label>
              <div className="grid grid-cols-3 gap-2">
                {DIMENSION_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setDimsPreset(preset.label)}
                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                      dimsPreset === preset.label
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => setDimsPreset('Custom')}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    dimsPreset === 'Custom'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  Custom
                </button>
              </div>
              {dimsPreset === 'Custom' && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Columns</Label>
                    <Input type="number" min={1} max={10} value={dimsCustomCols} onChange={e => setDimsCustomCols(Number(e.target.value))} />
                  </div>
                  <span className="mt-5 text-muted-foreground">×</span>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Rows</Label>
                    <Input type="number" min={1} max={10} value={dimsCustomRows} onChange={e => setDimsCustomRows(Number(e.target.value))} />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {editDims.cols} × {editDims.rows} = {editDims.cols * editDims.rows} card slots
              </p>
            </div>
            {overflowCount > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                {overflowCount} card{overflowCount !== 1 ? 's' : ''} won&apos;t fit and will be moved to a new page automatically.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDimsOpen(false)} disabled={savingDims}>Cancel</Button>
            <Button onClick={saveDimensions} disabled={savingDims}>
              {savingDims ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PageDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}>
      <PageDetailInner />
    </Suspense>
  )
}
