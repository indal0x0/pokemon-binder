'use client'

import { useState, useEffect } from 'react'
import { NavBar } from '@/components/NavBar'

export default function SettingsPage() {
  const [dataPath, setDataPath] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.getUserDataPath().then(p => setDataPath(p))
    }
  }, [])

  return (
    <div className="min-h-screen">
      <NavBar backHref="/" />
      <main className="p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          {dataPath && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Data Storage</h2>
              <div className="bg-card border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Your binder data and card images are stored at:</p>
                <code className="text-xs break-all">{dataPath}</code>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">About</h2>
            <div className="bg-card border rounded-lg p-4 text-sm text-muted-foreground space-y-1">
              <p>Pokemon Binder — track and value your collection.</p>
              <p className="text-xs">More links coming soon: GitHub, Discord, support.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
