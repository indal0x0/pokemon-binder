'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Heart, Search, X, Loader2, Trash2 } from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { toast } from 'sonner'
import type { WishlistCard, TcgCardResult, OnePieceCardResult } from '@/types/electron'
import * as api from '@/lib/api'

type AnyCard = TcgCardResult | OnePieceCardResult
type GameMode = 'pokemon' | 'onepiece'
type Priority = 'high' | 'medium' | 'low'

const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' }
const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}
const PRIORITY_CYCLE: Record<Priority, Priority> = { high: 'medium', medium: 'low', low: 'high' }

function GameBadge({ game }: { game: string }) {
  return game === 'onepiece'
    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-medium">One Piece</span>
    : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">Pokémon</span>
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistCard[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [gameMode, setGameMode] = useState<GameMode>('pokemon')
  const [sets, setSets] = useState<{ id: string; name: string }[]>([])
  const [selectedSet, setSelectedSet] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AnyCard[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load wishlist on mount
  useEffect(() => {
    api.listWishlistCards()
      .then(setWishlist)
      .catch(() => toast.error('Failed to load wishlist'))
      .finally(() => setLoading(false))
  }, [])

  // Load sets when game mode changes
  useEffect(() => {
    setSets([])
    setSelectedSet('')
    setSearchResults([])
    setSearchQuery('')
    if (gameMode === 'pokemon') {
      api.getPokemonSets().then(setSets).catch(() => {})
    } else {
      api.getOptcgSets().then(setSets).catch(() => {})
    }
  }, [gameMode])

  const runSearch = useCallback(async (q: string, mode: GameMode, set: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      if (mode === 'onepiece') {
        const { cards } = await api.searchOptcg(q.trim(), set || undefined)
        setSearchResults(cards)
      } else {
        const { cards } = await api.searchTcg(q.trim(), 1)
        const filtered = set ? cards.filter(c => c.setId === set) : cards
        setSearchResults(filtered)
      }
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }, [])

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setSearchResults([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value, gameMode, selectedSet), 400)
  }

  async function addToWishlist(card: AnyCard) {
    const alreadyAdded = wishlist.some(w => w.tcgApiId === card.tcgApiId)
    if (alreadyAdded) {
      toast.info('Already in wishlist')
      return
    }
    setAddingId(card.tcgApiId)
    try {
      const created = await api.createWishlistCard({
        tcgApiId: card.tcgApiId,
        name: card.name,
        setId: card.setId,
        setName: card.setName,
        collectorNumber: card.collectorNumber,
        imageUrl: card.imageUrl ?? null,
        cardGame: 'cardGame' in card ? card.cardGame : 'pokemon',
        priority: 'medium',
      })
      setWishlist(prev => [created, ...prev])
      toast.success(`Added ${card.name} to wishlist`)
    } catch {
      toast.error('Failed to add to wishlist')
    } finally {
      setAddingId(null)
    }
  }

  async function removeFromWishlist(id: string) {
    try {
      await api.deleteWishlistCard(id)
      setWishlist(prev => prev.filter(w => w.id !== id))
    } catch {
      toast.error('Failed to remove card')
    }
  }

  async function cyclePriority(card: WishlistCard) {
    const next = PRIORITY_CYCLE[card.priority]
    try {
      const updated = await api.updateWishlistCard(card.id, { priority: next })
      setWishlist(prev => prev.map(w => w.id === card.id ? updated : w))
    } catch {
      toast.error('Failed to update priority')
    }
  }

  async function saveNotes(card: WishlistCard) {
    try {
      const updated = await api.updateWishlistCard(card.id, { notes: notesInput.trim() || null })
      setWishlist(prev => prev.map(w => w.id === card.id ? updated : w))
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setEditingNotes(null)
    }
  }

  const addedIds = new Set(wishlist.map(w => w.tcgApiId))

  return (
    <>
      <NavBar backHref="/" />
      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Wishlist</h1>
            {wishlist.length > 0 && (
              <Badge variant="secondary" className="text-xs">{wishlist.length}</Badge>
            )}
          </div>
          <button
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            Add Cards
          </button>
        </div>

        {/* Wishlist grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Heart className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Your wishlist is empty</p>
            <p className="text-xs mt-1 opacity-60">Search for cards to add them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {wishlist.map(card => (
              <div
                key={card.id}
                className="group relative bg-card border border-border/50 rounded-xl overflow-hidden hover:border-border hover:shadow-md transition-all duration-200"
              >
                {/* Card image */}
                {card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    loading="lazy"
                    className="w-full aspect-[2.5/3.5] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[2.5/3.5] bg-secondary/60 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground text-center px-2">{card.name}</span>
                  </div>
                )}

                {/* Remove button (top-right on hover) */}
                <button
                  onClick={() => removeFromWishlist(card.id)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-background/90 rounded-md p-1 hover:bg-destructive hover:text-destructive-foreground transition-all"
                  title="Remove from wishlist"
                >
                  <Trash2 className="h-3 w-3" />
                </button>

                {/* Info */}
                <div className="p-2 space-y-1.5">
                  <p className="text-xs font-medium leading-tight line-clamp-1">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{card.setName}</p>

                  <div className="flex items-center gap-1 flex-wrap">
                    <GameBadge game={card.cardGame} />
                    <button
                      onClick={() => cyclePriority(card)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium transition-colors ${PRIORITY_COLORS[card.priority]}`}
                      title="Click to change priority"
                    >
                      {PRIORITY_LABELS[card.priority]}
                    </button>
                  </div>

                  {/* Notes */}
                  {editingNotes === card.id ? (
                    <textarea
                      autoFocus
                      className="w-full text-[10px] px-1.5 py-1 rounded border border-border bg-background resize-none"
                      rows={2}
                      value={notesInput}
                      onChange={e => setNotesInput(e.target.value)}
                      onBlur={() => saveNotes(card)}
                      onKeyDown={e => { if (e.key === 'Escape') setEditingNotes(null) }}
                      placeholder="Add a note..."
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingNotes(card.id); setNotesInput(card.notes ?? '') }}
                      className="w-full text-left text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors truncate"
                      title={card.notes ?? 'Click to add a note'}
                    >
                      {card.notes ? card.notes : <span className="opacity-40">Add note...</span>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Search panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setPanelOpen(false)} />
          <div className="relative w-[min(24rem,100vw)] h-full bg-background border-l flex flex-col shadow-xl">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-semibold text-sm">Add to Wishlist</h2>
              <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Game selector */}
            <div className="flex gap-1.5 px-3 py-2">
              {(['pokemon', 'onepiece'] as GameMode[]).map(mode => (
                <button key={mode} onClick={() => setGameMode(mode)}
                  className={`flex-1 py-1 rounded-full text-xs font-medium transition-colors ${gameMode === mode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {mode === 'pokemon' ? 'Pokémon' : 'One Piece'}
                </button>
              ))}
            </div>

            {/* Set filter */}
            {sets.length > 0 && (
              <div className="px-3 pb-2">
                <select
                  value={selectedSet}
                  onChange={e => { setSelectedSet(e.target.value); if (searchQuery.length >= 2) runSearch(searchQuery, gameMode, e.target.value) }}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="">All Sets</option>
                  {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

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

            {/* Results */}
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
              {searchResults.map(card => {
                const inWishlist = addedIds.has(card.tcgApiId)
                return (
                  <div key={card.tcgApiId} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 border-b border-border/30">
                    {card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.imageUrl} alt={card.name} className="w-8 h-11 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-11 rounded bg-secondary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{card.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{card.setName}</p>
                      {card.collectorNumber && (
                        <p className="text-[10px] text-muted-foreground/60">#{card.collectorNumber}</p>
                      )}
                    </div>
                    <button
                      onClick={() => addToWishlist(card)}
                      disabled={inWishlist || addingId === card.tcgApiId}
                      className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-md border transition-colors ${
                        inWishlist
                          ? 'border-border/30 text-muted-foreground/40 cursor-default'
                          : 'border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground'
                      }`}
                    >
                      {addingId === card.tcgApiId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : inWishlist ? (
                        'Added'
                      ) : (
                        '+ Add'
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
