'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme =
  | 'obsidian' | 'arctic' | 'ember' | 'slate'
  | 'pokeball' | 'masterball' | 'greatball' | 'legendary'
  | 'inferno' | 'abyss' | 'verdant' | 'thunder' | 'psyche'
  | 'glacier' | 'specter' | 'chrome' | 'blush' | 'toxin'
  | 'brawler' | 'terra' | 'tempest' | 'synthwave' | 'neon'
  | 'sunset' | 'aurora' | 'pokepc'

export type BgAnimation =
  | 'none' | 'sparkles' | 'gradient' | 'fire' | 'water' | 'electric' | 'leaves' | 'snow' | 'stars'
  | 'rain' | 'fireflies' | 'aurora' | 'pokeballs' | 'matrix' | 'bubbles' | 'galaxy' | 'waves' | 'confetti' | 'fog'

const THEMES: { id: Theme; label: string; color: string }[] = [
  // Original themes
  { id: 'obsidian',   label: 'Obsidian',    color: 'oklch(0.65 0.18 250)'  },
  { id: 'arctic',     label: 'Arctic',      color: 'oklch(0.70 0.13 195)'  },
  { id: 'ember',      label: 'Ember',       color: 'oklch(0.72 0.18 55)'   },
  { id: 'slate',      label: 'Slate',       color: 'oklch(0.75 0.003 260)' },
  { id: 'pokeball',   label: 'Pokéball',    color: 'oklch(0.62 0.24 25)'   },
  { id: 'masterball', label: 'Master Ball', color: 'oklch(0.60 0.22 300)'  },
  { id: 'greatball',  label: 'Great Ball',  color: 'oklch(0.58 0.20 240)'  },
  { id: 'legendary',  label: 'Legendary',   color: 'oklch(0.78 0.18 85)'   },
  // New vibrant themes
  { id: 'inferno',    label: 'Inferno',     color: 'oklch(0.68 0.28 30)'   },
  { id: 'abyss',      label: 'Abyss',       color: 'oklch(0.72 0.22 195)'  },
  { id: 'verdant',    label: 'Verdant',     color: 'oklch(0.72 0.24 135)'  },
  { id: 'thunder',    label: 'Thunder',     color: 'oklch(0.85 0.20 95)'   },
  { id: 'psyche',     label: 'Psyche',      color: 'oklch(0.70 0.28 340)'  },
  { id: 'glacier',    label: 'Glacier',     color: 'oklch(0.80 0.12 200)'  },
  { id: 'specter',    label: 'Specter',     color: 'oklch(0.65 0.25 285)'  },
  { id: 'chrome',     label: 'Chrome',      color: 'oklch(0.78 0.05 220)'  },
  { id: 'blush',      label: 'Blush',       color: 'oklch(0.72 0.22 355)'  },
  { id: 'toxin',      label: 'Toxin',       color: 'oklch(0.65 0.28 305)'  },
  { id: 'brawler',    label: 'Brawler',     color: 'oklch(0.68 0.24 42)'   },
  { id: 'terra',      label: 'Terra',       color: 'oklch(0.72 0.18 70)'   },
  { id: 'tempest',    label: 'Tempest',     color: 'oklch(0.75 0.22 215)'  },
  { id: 'synthwave',  label: 'Synthwave',   color: 'oklch(0.65 0.30 340)'  },
  { id: 'neon',       label: 'Neon',        color: 'oklch(0.72 0.30 210)'  },
  { id: 'sunset',     label: 'Sunset',      color: 'oklch(0.72 0.28 50)'   },
  { id: 'aurora',     label: 'Aurora',      color: 'oklch(0.75 0.22 160)'  },
  // Special
  { id: 'pokepc',     label: 'Pokemon PC',  color: 'oklch(0.52 0.22 240)'  },
]

const ANIMATIONS: { id: BgAnimation; label: string; icon: string }[] = [
  { id: 'none',      label: 'None',      icon: '○' },
  { id: 'sparkles',  label: 'Sparkles',  icon: '✦' },
  { id: 'gradient',  label: 'Gradient',  icon: '◈' },
  { id: 'fire',      label: 'Fire',      icon: '🔥' },
  { id: 'water',     label: 'Water',     icon: '💧' },
  { id: 'electric',  label: 'Electric',  icon: '⚡' },
  { id: 'leaves',    label: 'Leaves',    icon: '🍃' },
  { id: 'snow',      label: 'Snow',      icon: '❄' },
  { id: 'stars',     label: 'Stars',     icon: '★' },
  { id: 'rain',      label: 'Rain',      icon: '🌧' },
  { id: 'fireflies', label: 'Fireflies', icon: '✨' },
  { id: 'aurora',    label: 'Aurora',    icon: '🌌' },
  { id: 'pokeballs', label: 'Pokéballs', icon: '⚽' },
  { id: 'matrix',    label: 'Matrix',    icon: '▓' },
  { id: 'bubbles',   label: 'Bubbles',   icon: '◎' },
  { id: 'galaxy',    label: 'Galaxy',    icon: '✧' },
  { id: 'waves',     label: 'Waves',     icon: '〜' },
  { id: 'confetti',  label: 'Confetti',  icon: '🎊' },
  { id: 'fog',       label: 'Fog',       icon: '☁' },
]

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  themes: typeof THEMES
  bgAnimation: BgAnimation
  setBgAnimation: (a: BgAnimation) => void
  animations: typeof ANIMATIONS
}>({ theme: 'obsidian', setTheme: () => {}, themes: THEMES, bgAnimation: 'none', setBgAnimation: () => {}, animations: ANIMATIONS })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('obsidian')
  const [bgAnimation, setBgAnimationState] = useState<BgAnimation>('none')

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null
    if (storedTheme && THEMES.some(t => t.id === storedTheme)) {
      applyTheme(storedTheme)
      setThemeState(storedTheme)
    }
    const storedAnim = localStorage.getItem('bg-animation') as BgAnimation | null
    if (storedAnim && ANIMATIONS.some(a => a.id === storedAnim)) {
      setBgAnimationState(storedAnim)
    }
  }, [])

  function applyTheme(t: Theme) {
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme', t)
  }

  function setTheme(t: Theme) {
    setThemeState(t)
    applyTheme(t)
  }

  function setBgAnimation(a: BgAnimation) {
    setBgAnimationState(a)
    localStorage.setItem('bg-animation', a)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, bgAnimation, setBgAnimation, animations: ANIMATIONS }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
