'use client'

export const PRESETS = [
  { id: 'pokeball',   label: 'Pokéball' },
  { id: 'masterball', label: 'Master Ball' },
  { id: 'ultraball',  label: 'Ultra Ball' },
  { id: 'greatball',  label: 'Great Ball' },
  { id: 'fire',       label: 'Fire' },
  { id: 'water',      label: 'Water' },
  { id: 'grass',      label: 'Grass' },
  { id: 'electric',   label: 'Electric' },
  { id: 'psychic',    label: 'Psychic' },
  { id: 'dragon',     label: 'Dragon' },
  { id: 'shadow',     label: 'Shadow' },
  { id: 'legendary',  label: 'Legendary' },
]

export const PATTERNS: { id: string; label: string; svg: string }[] = [
  { id: 'none', label: 'None', svg: '' },
  {
    id: 'dots',
    label: 'Dots',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='2.5' fill='rgba(255,255,255,0.22)'/></svg>`,
  },
  {
    id: 'grid',
    label: 'Grid',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M 20 0 L 0 0 0 20' fill='none' stroke='rgba(255,255,255,0.18)' stroke-width='1'/></svg>`,
  },
  {
    id: 'stripes',
    label: 'Stripes',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><line x1='0' y1='12' x2='12' y2='0' stroke='rgba(255,255,255,0.2)' stroke-width='2'/></svg>`,
  },
  {
    id: 'scales',
    label: 'Scales',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='0' cy='10' r='10' fill='none' stroke='rgba(255,255,255,0.15)' stroke-width='1'/><circle cx='20' cy='10' r='10' fill='none' stroke='rgba(255,255,255,0.15)' stroke-width='1'/><circle cx='10' cy='0' r='10' fill='none' stroke='rgba(255,255,255,0.15)' stroke-width='1'/><circle cx='10' cy='20' r='10' fill='none' stroke='rgba(255,255,255,0.15)' stroke-width='1'/></svg>`,
  },
  {
    id: 'stars',
    label: 'Stars',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'><polygon points='15,3 17,11 25,11 19,16 21,24 15,19 9,24 11,16 5,11 13,11' fill='rgba(255,255,255,0.13)'/></svg>`,
  },
]

export function getPresetUrl(preset: string) {
  if (typeof window !== 'undefined' && window.location.protocol === 'app:') {
    return `app://./preset-covers/${preset}.svg`
  }
  return `/preset-covers/${preset}.svg`
}

export function patternStyle(patternId: string | null | undefined): React.CSSProperties {
  if (!patternId || patternId === 'none') return {}
  const p = PATTERNS.find(pt => pt.id === patternId)
  if (!p || !p.svg) return {}
  const encoded = encodeURIComponent(p.svg)
  return { backgroundImage: `url("data:image/svg+xml,${encoded}")` }
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
  if (binder.coverPreset) {
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
      ? (window.electronAPI?.getImageUrl(binder.coverImagePath) ?? null)
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
