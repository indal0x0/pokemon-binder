'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CardRow } from '@/types/electron'

const MAX_SELECTION = 15

export function TcgScraperModal({
  open,
  cards,
  onClose,
  onDone,
}: {
  open: boolean
  cards: CardRow[]
  onClose: () => void
  onDone: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scraping, setScraping] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelected(new Set())
      setScraping(false)
      setProgress(0)
      setProgressLabel('')
    }
  }, [open])

  // Register scrape progress listener
  useEffect(() => {
    if (!window.electronAPI?.onScrapeProgress) return
    const unsub = window.electronAPI.onScrapeProgress(({ current, total, name }) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0
      setProgress(pct)
      setProgressLabel(name)
    })
    return unsub
  }, [])

  function toggleCard(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= MAX_SELECTION) {
          toast.warning(`You can only scrape up to ${MAX_SELECTION} cards at a time.`)
          return prev
        }
        next.add(id)
      }
      return next
    })
  }

  async function startScrape() {
    if (!window.electronAPI || selected.size === 0) return
    setScraping(true)
    setProgress(0)
    setProgressLabel('')
    try {
      const result = await window.electronAPI.scrapeSelectedCards(Array.from(selected))
      toast.success(`TCGPlayer: updated prices for ${result.updated} card${result.updated !== 1 ? 's' : ''}`)
      onDone()
    } catch {
      toast.error('Failed to scrape TCGPlayer prices')
      setScraping(false)
    }
  }

  // Cards that can be priced (have a TCG API ID)
  const priceable = cards.filter(c => c.tcgApiId && !c.tcgApiId.startsWith('unmatched-'))

  return (
    <Dialog open={open} onOpenChange={open => !open && !scraping && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scrape from TCGPlayer</DialogTitle>
          <DialogDescription>
            Select up to {MAX_SELECTION} cards to fetch more accurate prices directly from TCGPlayer.
            This may take a moment. Prices will update after scraping completes.
          </DialogDescription>
        </DialogHeader>

        {scraping ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Scraping prices from TCGPlayer...</span>
            </div>
            <Progress value={progress} className="gap-0">
              <ProgressTrack className="h-2">
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            {progressLabel && (
              <p className="text-xs text-muted-foreground truncate">{progressLabel}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {progress}% complete — please wait
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {selected.size} / {MAX_SELECTION} selected
                </p>
                {selected.size > 0 && (
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
                {priceable.map(card => {
                  const isSelected = selected.has(card.id)
                  const imgSrc = card.imageUrl
                    ? card.imageUrl.startsWith('uploads/')
                      ? window.electronAPI?.getImageUrl(card.imageUrl) ?? card.imageUrl
                      : card.imageUrl
                    : null
                  return (
                    <button
                      key={card.id}
                      onClick={() => toggleCard(card.id)}
                      className={`relative rounded-lg border overflow-hidden transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/40'
                          : 'border-border hover:border-primary/50'
                      }`}
                      title={card.name}
                    >
                      {imgSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgSrc}
                          alt={card.name}
                          className="w-full aspect-[2.5/3.5] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[2.5/3.5] bg-secondary/60 flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground text-center px-1 leading-tight">
                            {card.name}
                          </span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-5 w-5 text-primary drop-shadow" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-1 py-0.5">
                        <p className="text-[9px] truncate leading-tight">{card.name}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {priceable.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No priceable cards in this binder.
                </p>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          {!scraping && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          {!scraping && (
            <Button onClick={startScrape} disabled={selected.size === 0}>
              Scrape {selected.size > 0 ? `${selected.size} card${selected.size !== 1 ? 's' : ''}` : 'cards'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
