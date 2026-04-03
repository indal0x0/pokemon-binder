'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ImageIcon, Palette } from 'lucide-react'
import Link from 'next/link'
import { BinderCover } from '@/components/BinderCover'

type CoverMode = 'color' | 'image'

export default function NewBinderPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [coverMode, setCoverMode] = useState<CoverMode>('color')
  const [coverColor, setCoverColor] = useState('#3b82f6')
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverImageFile(file)
    const url = URL.createObjectURL(file)
    setCoverImagePreview(url)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !window.electronAPI) return
    setLoading(true)
    try {
      let coverImagePath: string | null = null
      const binder = await window.electronAPI.createBinder({
        name: name.trim(),
        description: description.trim() || undefined,
        coverColor: coverMode === 'color' ? coverColor : null,
        coverImagePath: null,
      })
      if (coverMode === 'image' && coverImageFile) {
        coverImagePath = await window.electronAPI.uploadCover(binder.id, coverImageFile)
        await window.electronAPI.updateBinder(binder.id, { coverImagePath, coverColor: null })
      }
      router.push(`/binder?id=${binder.id}`)
    } finally {
      setLoading(false)
    }
  }

  const previewBinder = {
    coverColor: coverMode === 'color' ? coverColor : null,
    coverImagePath: coverMode === 'image' && coverImagePreview ? '__preview__' : null,
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCoverMode('color')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${coverMode === 'color' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}
                >
                  <Palette className="h-3.5 w-3.5" /> Color
                </button>
                <button
                  type="button"
                  onClick={() => setCoverMode('image')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${coverMode === 'image' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-secondary'}`}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Image
                </button>
              </div>

              <div className="flex items-center gap-4 pt-1">
                {/* Preview */}
                {coverMode === 'image' && coverImagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImagePreview} alt="Cover preview" className="w-14 h-20 rounded object-cover flex-shrink-0 border" />
                ) : (
                  <BinderCover binder={previewBinder} className="w-14 h-20 rounded flex-shrink-0 border" />
                )}

                {coverMode === 'color' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={coverColor}
                      onChange={e => setCoverColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{coverColor}</span>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      {coverImageFile ? 'Change Image' : 'Choose Image'}
                    </Button>
                    {coverImageFile && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[180px]">{coverImageFile.name}</p>
                    )}
                  </div>
                )}
              </div>
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
