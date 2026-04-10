'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, ArrowLeft } from 'lucide-react'
import { ThemeSwitcher } from './ThemeSwitcher'
import { NavSidebar } from './NavSidebar'

export function NavBar({ backHref }: { backHref: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link
            href={backHref}
            className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <ThemeSwitcher />
      </div>

      <NavSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  )
}
