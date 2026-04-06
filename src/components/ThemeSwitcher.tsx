'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette, RotateCcw } from 'lucide-react'
import { useTheme } from './ThemeProvider'

type Tab = 'themes' | 'backgrounds' | 'customize'

const COLOR_PICKERS = [
  { key: 'background' as const, label: 'Background', hint: 'Main app background' },
  { key: 'sidebar'    as const, label: 'Sidebar',    hint: 'Navigation panel' },
  { key: 'cards'      as const, label: 'Cards',      hint: 'Card & panel surfaces' },
  { key: 'accent'     as const, label: 'Accent',     hint: 'Buttons & highlights' },
]

export function ThemeSwitcher() {
  const { theme, setTheme, themes, bgAnimation, setBgAnimation, animations, customColors, setCustomColors, resetCustomColors } = useTheme()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('themes')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const hasCustomColors = Object.values(customColors).some(Boolean)

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
        <div className="absolute right-0 top-full mt-1 bg-popover border border-border/60 rounded-xl shadow-xl shadow-black/30 min-w-[220px] z-50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border/40">
            {(['themes', 'backgrounds', 'customize'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-[11px] py-2 font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-foreground border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
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

            {activeTab === 'customize' && (
              <div className="space-y-3 py-1">
                <p className="text-[10px] text-muted-foreground px-1 leading-tight">
                  Override theme colors. Changes apply on top of the active theme.
                </p>
                {COLOR_PICKERS.map(({ key, label, hint }) => (
                  <div key={key} className="flex items-center justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-none">{label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
                    </div>
                    <input
                      type="color"
                      value={customColors[key] || '#000000'}
                      onChange={e => setCustomColors({ ...customColors, [key]: e.target.value })}
                      className="h-7 w-10 rounded cursor-pointer border border-border/60 bg-transparent p-0.5"
                      title={`Set ${label.toLowerCase()} color`}
                    />
                  </div>
                ))}
                {hasCustomColors && (
                  <button
                    onClick={resetCustomColors}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-lg py-1.5 mt-1 transition-colors hover:bg-secondary/40"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset to theme defaults
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
