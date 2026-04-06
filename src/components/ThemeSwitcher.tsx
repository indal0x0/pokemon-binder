'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeSwitcher() {
  const { theme, setTheme, themes, bgAnimation, setBgAnimation, animations } = useTheme()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'themes' | 'backgrounds'>('themes')
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
        <div className="absolute right-0 top-full mt-1 bg-popover border border-border/60 rounded-xl shadow-xl shadow-black/30 min-w-[200px] z-50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border/40">
            <button
              onClick={() => setActiveTab('themes')}
              className={`flex-1 text-xs py-2 font-medium transition-colors ${
                activeTab === 'themes'
                  ? 'text-foreground border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Themes
            </button>
            <button
              onClick={() => setActiveTab('backgrounds')}
              className={`flex-1 text-xs py-2 font-medium transition-colors ${
                activeTab === 'backgrounds'
                  ? 'text-foreground border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Backgrounds
            </button>
          </div>

          <div className="p-2">
            {activeTab === 'themes' && (
              <div className="max-h-64 overflow-y-auto pr-0.5 space-y-0.5">
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
            )}

            {activeTab === 'backgrounds' && (
              <div className="max-h-64 overflow-y-auto pr-0.5 space-y-0.5">
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}
