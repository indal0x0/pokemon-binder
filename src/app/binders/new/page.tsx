'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBinderPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/binders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      })
      const data = await res.json()
      router.push(`/binders/${data.id}`)
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
            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Binder'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
