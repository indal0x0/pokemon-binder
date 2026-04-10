'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Award, Heart, Menu, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { NavSidebar } from '@/components/NavSidebar'

export default function LandingPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <NavSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-h-screen p-6 max-w-6xl mx-auto flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-10">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight shimmer-text mb-2">OffDex</h1>
            <p className="text-muted-foreground text-base">Track and value your collection</p>
          </div>

          <div className="grid grid-cols-3 gap-5 w-full max-w-2xl">
            <Link href="/binders">
              <div className="group rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-200 shadow-sm shadow-black/10 cursor-pointer flex flex-col items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-base">Binders</p>
                  <p className="text-muted-foreground text-xs mt-1">Organize cards in binders</p>
                </div>
              </div>
            </Link>

            <Link href="/slabs">
              <div className="group rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-200 shadow-sm shadow-black/10 cursor-pointer flex flex-col items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-base">Slabs</p>
                  <p className="text-muted-foreground text-xs mt-1">Track your graded collection</p>
                </div>
              </div>
            </Link>

            <Link href="/wishlist">
              <div className="group rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-200 shadow-sm shadow-black/10 cursor-pointer flex flex-col items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-4 group-hover:bg-primary/20 transition-colors">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-base">Wishlist</p>
                  <p className="text-muted-foreground text-xs mt-1">Cards you want to collect</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
