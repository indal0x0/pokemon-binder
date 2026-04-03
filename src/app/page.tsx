'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Plus, BookOpen, ChevronRight, Settings } from 'lucide-react'
import type { BinderRow } from '@/types/electron'

export default function HomePage() {
  const [binders, setBinders] = useState<BinderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.electronAPI) { setLoading(false); return }
    window.electronAPI.listBinders().then(data => {
      setBinders(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pokemon Binder</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and value your collection</p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/binders/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Binder
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-muted-foreground text-sm">Loading...</div>
      ) : binders.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No binders yet. Create one to start tracking your cards.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {binders.map(binder => (
            <Link key={binder.id} href={`/binder?id=${binder.id}`}>
              <Card className="hover:bg-secondary/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div>
                    <p className="font-medium">{binder.name}</p>
                    {binder.description && (
                      <p className="text-muted-foreground text-xs mt-0.5">{binder.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">{binder.cardCount ?? 0} cards</Badge>
                      <Badge variant="secondary" className="text-xs">{binder.pageCount ?? 0} pages</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatCurrency(binder.totalValue ?? 0)}</p>
                      <p className="text-xs text-muted-foreground">market value</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
