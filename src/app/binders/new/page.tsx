'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CoverPicker, defaultCoverState, type CoverState } from '@/components/CoverPicker'

export default function NewBinderPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [cover, setCover] = useState<CoverState>(defaultCoverState())

  function updateCover(next: Partial<CoverState>) {
    setCover(prev => ({ ...prev, ...next }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !window.electronAPI) return
    setLoading(true)
    try {
      const binder = await window.electronAPI.createBinder({
        name: name.trim(),
        description: description.trim() || undefined,
        coverColor: cover.mode === 'color' ? cover.color : null,
        coverPattern: cover.mode === 'color' ? cover.pattern : null,
        coverPreset: cover.mode === 'preset' ? cover.preset : null,
        coverImagePath: null,
      })
      if (cover.mode === 'image' && cover.imageFile) {
        const coverImagePath = await window.electronAPI.uploadCover(binder.id, cover.imageFile)
        await window.electronAPI.updateBinder(binder.id, { coverImagePath, coverColor: null, coverPreset: null })
      }
      router.push(`/binder?id=${binder.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-lg mx-auto">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New Binder</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Base Set Collection"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="desc"
                placeholder="e.g. Vintage holos, 1999-2000"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cover</Label>
              <CoverPicker state={cover} onChange={updateCover} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Binder'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
