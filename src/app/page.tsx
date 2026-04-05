'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BinderCover } from '@/components/BinderCover'
import { formatCurrency } from '@/lib/utils'
import { Plus, BookOpen, Settings } from 'lucide-react'
import type { BinderRow } from '@/types/electron'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

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
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight shimmer-text">Pokemon Binder</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and value your collection
            {binders.length > 0 && (
              <span className="ml-2 text-primary font-semibold">
                · {formatCurrency(binders.reduce((s, b) => s + (b.totalValue ?? 0), 0))} total
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/binders/new">
            <Button size="sm" className="shadow-sm">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {binders.map((binder, i) => (
            <Link key={binder.id} href={`/binder?id=${binder.id}`}
              className="animate-fade-slide-up"
              style={{ animationDelay: `${i * 55}ms` }}>
              <div className="group rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-200 shadow-sm shadow-black/10 cursor-pointer overflow-hidden">
                <div className="relative w-full aspect-[3/4]">
                  <BinderCover binder={binder} className="w-full h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{binder.name}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{binder.cardCount ?? 0} cards</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{binder.pageCount ?? 0} pages</Badge>
                  </div>
                  <p className="text-primary font-semibold text-sm mt-2">{formatCurrency(binder.totalValue ?? 0)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
