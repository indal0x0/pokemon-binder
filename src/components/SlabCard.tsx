'use client'

import { Award } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { SlabRow } from '@/types/electron'
import * as api from '@/lib/api'

interface Props {
  slab: SlabRow
  onClick: () => void
}

export function SlabCard({ slab, onClick }: Props) {
  const imageUrl = slab.imageUrl
    ? slab.imageUrl.startsWith('uploads/')
      ? api.getImageUrl(slab.imageUrl) ?? null
      : slab.imageUrl
    : null

  return (
    <button
      onClick={onClick}
      className="group rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-200 shadow-sm shadow-black/10 cursor-pointer overflow-hidden w-full text-left"
    >
      <div className="relative w-full aspect-[3/4]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={slab.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Award className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
        {(slab.gradingCompany || slab.grade) && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded px-1.5 py-0.5 shadow">
            {[slab.gradingCompany, slab.grade].filter(Boolean).join(' ')}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm truncate">{slab.name}</p>
        <p className="text-primary font-semibold text-sm mt-1">{formatCurrency(slab.currentPrice ?? 0)}</p>
      </div>
    </button>
  )
}
