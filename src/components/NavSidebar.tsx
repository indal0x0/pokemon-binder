'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, Home, Search, Settings } from 'lucide-react'

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/browse', label: 'Browse Cards', icon: Search },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function NavSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-background border-r border-border shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="text-sm font-semibold">Menu</span>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
