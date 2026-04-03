'use client'

import type { BinderRow } from '@/types/electron'

const DEFAULT_COLOR = '#3b82f6'

export function BinderCover({
  binder,
  className = '',
}: {
  binder: Pick<BinderRow, 'coverColor' | 'coverImagePath'>
  className?: string
}) {
  if (binder.coverImagePath) {
    const url = typeof window !== 'undefined'
      ? window.electronAPI?.getImageUrl(binder.coverImagePath) ?? null
      : null
    if (url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Binder cover" className={`object-cover ${className}`} />
      )
    }
  }

  const color = binder.coverColor || DEFAULT_COLOR
  return <div className={className} style={{ backgroundColor: color }} />
}
