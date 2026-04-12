/**
 * File system and image handling for Android/Capacitor.
 * Replaces the fs/path operations from electron/main.js.
 */

import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import { createId } from '@paralleldrive/cuid2'
import * as db from './db-android'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function ext(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || 'jpg'
}

async function saveFile(subdir: string, filename: string, file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const base64 = arrayBufferToBase64(buffer)
  const path = `${subdir}/${filename}`
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Data,
    recursive: true,
  })
  return path
}

export function getImageUrl(storedPath: string | null): string | null {
  if (!storedPath) return null
  // External URLs (https://...) pass through as-is
  if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) return storedPath
  // Local stored path → resolve to a WebView-safe URL
  return Capacitor.convertFileSrc(
    Capacitor.getPlatform() === 'android'
      ? `/data/user/0/com.offdex.app/files/${storedPath}`
      : storedPath
  )
}

export async function uploadCover(binderId: string, file: File): Promise<string> {
  const filename = `cover_${createId()}.${ext(file)}`
  return saveFile(`covers/${binderId}`, filename, file)
}

export async function uploadImage(binderId: string, file: File): Promise<string> {
  const filename = `page_${createId()}.${ext(file)}`
  return saveFile(`uploads/${binderId}`, filename, file)
}

export async function uploadCardImage(cardId: string, binderId: string, file: File) {
  const filename = `card_${createId()}.${ext(file)}`
  const path = await saveFile(`uploads/${binderId}`, filename, file)
  const updated = await db.updateCard(cardId, { imageUrl: path, isCustom: 1 })
  return updated
}

export async function uploadSlabImage(slabId: string, file: File) {
  const filename = `slab_${createId()}.${ext(file)}`
  const path = await saveFile('uploads/slabs', filename, file)
  const updated = await db.updateSlab(slabId, { imageUrl: path })
  return updated
}
