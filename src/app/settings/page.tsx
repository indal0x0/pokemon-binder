'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState('')
  const [tcgKey, setTcgKey] = useState('')
  const [showGemini, setShowGemini] = useState(false)
  const [showTcg, setShowTcg] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dataPath, setDataPath] = useState<string | null>(null)
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsElectron(true)
      window.electronAPI.getSettings().then(s => {
        setGeminiKey(s.geminiApiKey || '')
        setTcgKey(s.pokemonTcgApiKey || '')
      })
      window.electronAPI.getUserDataPath().then(p => setDataPath(p))
    }
  }, [])

  async function handleSave() {
    if (!window.electronAPI) return
    setSaving(true)
    try {
      await window.electronAPI.saveSettings({
        geminiApiKey: geminiKey.trim(),
        pokemonTcgApiKey: tcgKey.trim(),
      })
      setSaved(true)
      toast.success('Settings saved.')
      setTimeout(() => setSaved(false), 3000)
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {!isElectron && (
        <div className="mb-6 p-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400">
          Settings are only available in the desktop app. Running in browser mode — use a <code>.env</code> file for API keys.
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">API Keys</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gemini-key">Gemini API Key <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Required for card scanning. Get yours free at Google AI Studio.</p>
              <div className="relative">
                <Input
                  id="gemini-key"
                  type={showGemini ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  disabled={!isElectron}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGemini(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tcg-key">Pokemon TCG API Key <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <p className="text-xs text-muted-foreground">Removes rate limits when fetching card prices. Free at pokemontcg.io.</p>
              <div className="relative">
                <Input
                  id="tcg-key"
                  type={showTcg ? 'text' : 'password'}
                  value={tcgKey}
                  onChange={e => setTcgKey(e.target.value)}
                  placeholder="Your TCG API key..."
                  disabled={!isElectron}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTcg(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showTcg ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {dataPath && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Data Storage</h2>
            <div className="bg-card border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Your binder data and card images are stored at:</p>
              <code className="text-xs break-all">{dataPath}</code>
            </div>
          </div>
        )}

        {isElectron && (
          <Button onClick={handleSave} disabled={saving || !isElectron} className="w-full">
            {saved ? (
              <><CheckCircle className="h-4 w-4 mr-2" /> Saved</>
            ) : saving ? (
              'Saving...'
            ) : (
              'Save Settings'
            )}
          </Button>
        )}
      </div>
    </main>
  )
}
