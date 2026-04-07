'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Award, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { NavBar } from '@/components/NavBar'
import { SlabCard } from '@/components/SlabCard'
import { AddSlabModal } from '@/components/AddSlabModal'
import { SlabDetailModal } from '@/components/SlabDetailModal'
import type { SlabRow } from '@/types/electron'

type SortMode = 'recent' | 'oldest' | 'grade-high' | 'grade-low' | 'value'

const SORT_LABELS: Record<SortMode, string> = {
  recent: 'Most Recent',
  oldest: 'Least Recent',
  'grade-high': 'Grade ↓',
  'grade-low': 'Grade ↑',
  value: 'Value',
}

function gradeNum(g: string): number {
  const n = parseFloat(g)
  return isNaN(n) ? -1 : n
}

export default function SlabsPage() {
  const [slabs, setSlabs] = useState<SlabRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedSlab, setSelectedSlab] = useState<SlabRow | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('recent')

  useEffect(() => {
    if (!window.electronAPI) { setLoading(false); return }
    window.electronAPI.listSlabs().then(data => {
      setSlabs(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const sorted = [...slabs].sort((a, b) => {
    switch (sortMode) {
      case 'oldest': return a.createdAt.localeCompare(b.createdAt)
      case 'grade-high': return gradeNum(b.grade) - gradeNum(a.grade)
      case 'grade-low': return gradeNum(a.grade) - gradeNum(b.grade)
      case 'value': return (b.currentPrice ?? 0) - (a.currentPrice ?? 0)
      default: return b.createdAt.localeCompare(a.createdAt)
    }
  })

  const totalPaid = slabs.reduce((s, sl) => s + (sl.pricePaid ?? 0), 0)
  const totalCurrent = slabs.reduce((s, sl) => s + (sl.currentPrice ?? 0), 0)

  return (
    <>
      <main className="min-h-screen p-6 max-w-6xl mx-auto">
        <NavBar backHref="/" />

        <div className="flex items-center justify-between mb-6 mt-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight shimmer-text">Slabs</h1>
          </div>
          <Button size="sm" className="shadow-sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Slab
          </Button>
        </div>

        {/* Totals */}
        {slabs.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-card border border-border/50 rounded-xl px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Total Paid</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Current Value</p>
              <p className={`text-2xl font-bold ${totalCurrent >= totalPaid && totalPaid > 0 ? 'text-primary' : ''}`}>{formatCurrency(totalCurrent)}</p>
            </div>
          </div>
        )}

        {/* Sort controls */}
        {slabs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {(Object.keys(SORT_LABELS) as SortMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  sortMode === mode
                    ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                    : 'border-border/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-24 text-muted-foreground text-sm">Loading...</div>
        ) : slabs.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-4">No slabs yet. Add one to start tracking your graded collection.</p>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Slab
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {sorted.map((slab, i) => (
              <div key={slab.id} className="animate-fade-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                <SlabCard slab={slab} onClick={() => setSelectedSlab(slab)} />
              </div>
            ))}
          </div>
        )}
      </main>

      <AddSlabModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={slab => setSlabs(prev => [slab, ...prev])}
      />
      <SlabDetailModal
        slab={selectedSlab}
        onClose={() => setSelectedSlab(null)}
        onUpdated={updated => {
          setSlabs(prev => prev.map(s => s.id === updated.id ? updated : s))
          setSelectedSlab(updated)
        }}
        onDeleted={id => {
          setSlabs(prev => prev.filter(s => s.id !== id))
          setSelectedSlab(null)
        }}
      />
    </>
  )
}
