'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ImageIcon, Palette, Sparkles } from 'lucide-react'
import { BinderCover, PRESETS, PATTERNS, getPresetUrl, patternStyle } from '@/components/BinderCover'

export type CoverMode = 'preset' | 'color' | 'image'

export interface CoverState {
  mode: CoverMode
  color: string
  pattern: string
  preset: string | null
  imageFile: File | null
  imagePreview: string | null
}

export function defaultCoverState(): CoverState {
  return { mode: 'color', color: '#3b82f6', pattern: 'none', preset: null, imageFile: null, imagePreview: null }
}

interface Props {
  state: CoverState
  onChange: (next: Partial<CoverState>) => void
}

export function CoverPicker({ state, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onChange({ imageFile: file, imagePreview: URL.createObjectURL(file) })
  }

  // Build preview binder object
  const previewBinder = {
    coverPreset: state.mode === 'preset' ? state.preset : null,
    coverColor: state.mode === 'color' ? state.color : null,
    coverPattern: state.mode === 'color' ? state.pattern : null,
    coverImagePath: null,
  }

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1.5">
        {([
          ['preset', <Sparkles key="s" className="h-3.5 w-3.5" />, 'Preset'],
          ['color',  <Palette  key="p" className="h-3.5 w-3.5" />, 'Color'],
          ['image',  <ImageIcon key="i" className="h-3.5 w-3.5" />, 'Image'],
        ] as const).map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange({ mode: id })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
              state.mode === id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input hover:bg-secondary'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Preview + controls */}
      <div className="flex items-start gap-4">
        {/* Preview */}
        {state.mode === 'image' && state.imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.imagePreview} alt="Cover preview" className="w-14 h-20 rounded object-cover flex-shrink-0 border" />
        ) : (
          <BinderCover binder={previewBinder} className="w-14 h-20 rounded flex-shrink-0 border" />
        )}

        {/* Controls per mode */}
        <div className="flex-1 min-w-0">
          {state.mode === 'preset' && (
            <div className="grid grid-cols-4 gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ preset: p.id })}
                  title={p.label}
                  className={`relative rounded overflow-hidden border-2 transition-colors aspect-[2/3] ${
                    state.preset === p.id ? 'border-primary' : 'border-transparent hover:border-border'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getPresetUrl(p.id)} alt={p.label} className="w-full h-full object-cover" />
                  {state.preset === p.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-primary border-2 border-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {state.mode === 'color' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.color}
                  onChange={e => onChange({ color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                />
                <span className="text-sm text-muted-foreground font-mono">{state.color}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Pattern</p>
                <div className="flex gap-1.5 flex-wrap">
                  {PATTERNS.map(pt => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => onChange({ pattern: pt.id })}
                      title={pt.label}
                      className={`w-9 h-9 rounded border-2 transition-colors overflow-hidden flex-shrink-0 ${
                        state.pattern === pt.id ? 'border-primary' : 'border-border hover:border-primary/50'
                      }`}
                      style={{
                        backgroundColor: state.color,
                        ...(pt.id !== 'none' ? patternStyle(pt.id) : {}),
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {PATTERNS.find(p => p.id === state.pattern)?.label ?? 'None'}
                </p>
              </div>
            </div>
          )}

          {state.mode === 'image' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {state.imageFile ? 'Change Image' : 'Choose Image'}
              </Button>
              {state.imageFile && (
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[160px]">{state.imageFile.name}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
