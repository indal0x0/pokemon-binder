'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeSwitcher() {
  const { theme, setTheme, themes, bgAnimation, setBgAnimation, animations } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Change theme"
        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      >
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-popover border border-border/60 rounded-xl shadow-xl shadow-black/30 p-2 min-w-[190px] z-50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 pb-1.5">Theme</p>
          <div className="max-h-52 overflow-y-auto pr-0.5 space-y-0.5">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  theme === t.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-secondary/60'
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0 border border-white/10"
                  style={{ background: t.color }}
                />
                {t.label}
              </button>
            ))}
          </div>

          <div className="my-2 border-t border-border/40" />

          <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 pb-1.5">Background</p>
          <div className="space-y-0.5">
            {animations.map(a => (
              <button
                key={a.id}
                onClick={() => { setBgAnimation(a.id); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  bgAnimation === a.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-secondary/60'
                }`}
              >
                <span className="h-3 w-3 flex-shrink-0 flex items-center justify-center text-[10px] leading-none">
                  {a.icon}
                </span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
