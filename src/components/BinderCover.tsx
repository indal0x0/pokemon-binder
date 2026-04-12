'use client'

import * as api from '@/lib/api'

export const PRESETS = [
  { id: 'assorted-pokemon', label: 'Assorted Pokemon' },
  { id: 'eeveelutions',     label: 'Eeveelutions' },
  { id: 'mantyke',          label: 'Mantyke' },
  { id: 'pikachu',          label: 'Pikachu' },
  { id: 'riolu',            label: 'Riolu' },
  { id: 'vaporeon',         label: 'Vaporeon' },
]

export const PATTERNS: { id: string; label: string; svg: string }[] = [
  { id: 'none', label: 'None', svg: '' },
  {
    id: 'dots',
    label: 'Dots',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='2.5' fill='rgba(255,255,255,0.40)'/></svg>`,
  },
  {
    id: 'grid',
    label: 'Grid',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='rgba(255,255,255,0.35)' stroke-width='1'/></svg>`,
  },
  {
    id: 'stripes',
    label: 'Stripes',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><line x1='0' y1='12' x2='12' y2='0' stroke='rgba(255,255,255,0.38)' stroke-width='2'/></svg>`,
  },
  {
    id: 'scales',
    label: 'Scales',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='0' cy='10' r='10' fill='none' stroke='rgba(255,255,255,0.32)' stroke-width='1.5'/><circle cx='20' cy='10' r='10' fill='none' stroke='rgba(255,255,255,0.32)' stroke-width='1.5'/><circle cx='10' cy='0' r='10' fill='none' stroke='rgba(255,255,255,0.32)' stroke-width='1.5'/><circle cx='10' cy='20' r='10' fill='none' stroke='rgba(255,255,255,0.32)' stroke-width='1.5'/></svg>`,
  },
  {
    id: 'stars',
    label: 'Stars',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'><polygon points='15,3 17,11 25,11 19,16 21,24 15,19 9,24 11,16 5,11 13,11' fill='rgba(255,255,255,0.30)'/></svg>`,
  },
  {
    id: 'pokeball',
    label: 'Poké Ball',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><circle cx='20' cy='20' r='16' fill='none' stroke='rgba(255,255,255,0.35)' stroke-width='1.5'/><line x1='4' y1='20' x2='36' y2='20' stroke='rgba(255,255,255,0.35)' stroke-width='1.5'/><circle cx='20' cy='20' r='4' fill='none' stroke='rgba(255,255,255,0.50)' stroke-width='1.5'/></svg>`,
  },
  {
    id: 'hex',
    label: 'Hex',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='24'><polygon points='14,2 24,7.5 24,16.5 14,22 4,16.5 4,7.5' fill='none' stroke='rgba(255,255,255,0.35)' stroke-width='1.2'/></svg>`,
  },
  {
    id: 'zigzag',
    label: 'Zigzag',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='12'><polyline points='0,6 6,0 12,6 18,0 24,6' fill='none' stroke='rgba(255,255,255,0.38)' stroke-width='1.5'/><polyline points='0,12 6,6 12,12 18,6 24,12' fill='none' stroke='rgba(255,255,255,0.38)' stroke-width='1.5'/></svg>`,
  },
  {
    id: 'diamonds',
    label: 'Diamonds',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><polygon points='12,2 22,12 12,22 2,12' fill='none' stroke='rgba(255,255,255,0.38)' stroke-width='1.2'/></svg>`,
  },
]

export function getPresetUrl(preset: string) {
  if (typeof window !== 'undefined' && window.location.protocol === 'app:') {
    return `app://./preset-covers/${preset}.png`
  }
  return `/preset-covers/${preset}.png`
}

export function patternStyle(patternId: string | null | undefined): React.CSSProperties {
  if (!patternId || patternId === 'none') return {}
  const p = PATTERNS.find(pt => pt.id === patternId)
  if (!p || !p.svg) return {}
  const encoded = encodeURIComponent(p.svg)
  return {
    backgroundImage: `url("data:image/svg+xml,${encoded}")`,
    backgroundPosition: 'center',
  }
}

interface CoverSource {
  coverPreset?: string | null
  coverImagePath?: string | null
  coverColor?: string | null
  coverPattern?: string | null
}

export function BinderCover({
  binder,
  className = '',
  imageOverride,
}: {
  binder: CoverSource
  className?: string
  /** Pass a blob URL to preview an image before it's uploaded */
  imageOverride?: string | null
}) {
  if (binder.coverPreset && PRESETS.some(p => p.id === binder.coverPreset)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getPresetUrl(binder.coverPreset)}
        alt={binder.coverPreset}
        className={`object-cover ${className}`}
      />
    )
  }

  const imgUrl = imageOverride
    ?? (binder.coverImagePath && typeof window !== 'undefined'
      ? (api.getImageUrl(binder.coverImagePath) ?? null)
      : null)

  if (imgUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imgUrl} alt="Binder cover" className={`object-cover ${className}`} />
    )
  }

  const color = binder.coverColor || '#3b82f6'
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: color }}>
      {binder.coverPattern && binder.coverPattern !== 'none' && (
        <div className="absolute inset-0" style={patternStyle(binder.coverPattern)} />
      )}
    </div>
  )
}
