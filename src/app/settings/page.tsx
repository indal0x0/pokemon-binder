'use client'

import { useState, useEffect } from 'react'
import { NavBar } from '@/components/NavBar'
import { Button } from '@/components/ui/button'
import { GitBranch } from 'lucide-react'
import * as api from '@/lib/api'

export default function SettingsPage() {
  const [dataPath, setDataPath] = useState<string | null>(null)

  useEffect(() => {
    api.getUserDataPath().then(p => setDataPath(p)).catch(() => {})
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
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <p className="text-sm text-muted-foreground">OffDex — track and value your collection.</p>
              <p className="text-xs text-muted-foreground">Created by indal0x0</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => api.openExternal('https://github.com/indal0x0/off-dex')}
                >
                  <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                  GitHub
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Support <span className="ml-1.5 text-[10px] text-muted-foreground">coming soon</span>
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Donate <span className="ml-1.5 text-[10px] text-muted-foreground">coming soon</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
