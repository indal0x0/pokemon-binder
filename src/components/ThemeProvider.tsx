'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'obsidian' | 'arctic' | 'ember' | 'slate'

const THEMES: { id: Theme; label: string; color: string }[] = [
  { id: 'obsidian', label: 'Obsidian', color: 'oklch(0.65 0.18 250)' },
  { id: 'arctic',   label: 'Arctic',   color: 'oklch(0.70 0.13 195)' },
  { id: 'ember',    label: 'Ember',    color: 'oklch(0.72 0.18 55)'  },
  { id: 'slate',    label: 'Slate',    color: 'oklch(0.75 0.003 260)' },
]

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  themes: typeof THEMES
}>({ theme: 'obsidian', setTheme: () => {}, themes: THEMES })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('obsidian')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && THEMES.some(t => t.id === stored)) {
      applyTheme(stored)
      setThemeState(stored)
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
