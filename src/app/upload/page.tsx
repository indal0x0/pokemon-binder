'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface FileState {
  file: File
  preview: string
  status: 'pending' | 'done' | 'error'
  cardsFound?: number
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const binderId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('binderId') ?? ''
    : ''

  const [files, setFiles] = useState<FileState[]>([])
  const [uploading, setUploading] = useState(false)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    setFiles(prev => [
      ...prev,
      ...valid.map(f => ({ file: f, preview: URL.createObjectURL(f), status: 'pending' as const })),
    ])
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  async function handleUpload() {
    if (!files.length || uploading || !window.electronAPI) return
    setUploading(true)

    let totalCards = 0
    const updatedFiles = [...files]

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      try {
        // 1. Create a pending page row
        const page = await window.electronAPI.createPage({
          binderId,
          name: f.file.name.replace(/\.[^.]+$/, '') || `Page ${i + 1}`,
          status: 'processing',
        })

        // 2. Upload the image file
        const imagePath = await window.electronAPI.uploadImage(binderId, f.file)

        // 3. Update page with image path
        await window.electronAPI.updatePage(page.id, { imagePath } as Parameters<typeof window.electronAPI.updatePage>[1])

        // 4. Run Gemini scan + TCG match
        const result = await window.electronAPI.scanPage(binderId, page.id, imagePath)

        updatedFiles[i] = { ...f, status: 'done', cardsFound: result.count }
        totalCards += result.count
      } catch (err) {
        updatedFiles[i] = { ...f, status: 'error', error: err instanceof Error ? err.message : 'Failed' }
        // Mark page as error if we have a pageId (scan failed after page was created)
        toast.error(`Failed to scan ${f.file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
      setFiles([...updatedFiles])
    }

    toast.success(`Done! Found ${totalCards} cards across ${files.length} page${files.length !== 1 ? 's' : ''}.`)
    setUploading(false)
    setTimeout(() => router.push(`/binder?id=${binderId}`), 1500)
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <Link href={`/binder?id=${binderId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to binder
      </Link>

      <h1 className="text-xl font-bold mb-1">Upload Binder Pages</h1>
      <p className="text-sm text-muted-foreground mb-6">Photos are analyzed by AI to identify and value each card</p>

      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !uploading && document.getElementById('file-input')?.click()}
        className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors mb-4"
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">Drop images here or click to select</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG — multiple files supported</p>
        <input
          id="file-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {files.map((f, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.preview} alt="" className="w-full aspect-[3/4] object-cover" />
              {!uploading && f.status === 'pending' && (
                <button
                  onClick={e => { e.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)) }}
                  className="absolute top-1.5 right-1.5 bg-background/80 rounded-full p-0.5 hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-2 py-1.5 flex items-center gap-1.5">
                {f.status === 'pending' && uploading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                {f.status === 'done' && <CheckCircle className="h-3 w-3 text-green-500" />}
                {f.status === 'error' && <AlertCircle className="h-3 w-3 text-destructive" />}
                <span className="text-xs truncate">
                  {f.status === 'done' ? `${f.cardsFound} cards found` :
                   f.status === 'error' ? 'Failed' :
                   f.file.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <Button onClick={handleUpload} disabled={uploading} className="w-full">
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning {files.length} page{files.length !== 1 ? 's' : ''}...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> Scan {files.length} Page{files.length !== 1 ? 's' : ''}</>
          )}
        </Button>
      )}
    </main>
  )
}
