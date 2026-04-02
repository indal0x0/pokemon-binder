import path from 'path'

/**
 * Returns the absolute directory where uploads are stored.
 * - Electron: {userData}/uploads/[binderId]
 * - Web:      {cwd}/public/uploads/[binderId]
 */
export function getUploadDir(binderId: string): string {
  if (process.env.ELECTRON_USER_DATA) {
    return path.join(process.env.ELECTRON_USER_DATA, 'uploads', binderId)
  }
  return path.join(process.cwd(), 'public', 'uploads', binderId)
}

/**
 * Returns the URL path used to serve an image (stored in the DB as imagePath).
 * - Electron: /api/images/{binderId}/{filename}  (served by API route)
 * - Web:      /uploads/{binderId}/{filename}      (served by Next.js static)
 */
export function getImageServingPath(binderId: string, filename: string): string {
  if (process.env.ELECTRON_USER_DATA) {
    return `/api/images/${binderId}/${filename}`
  }
  return `/uploads/${binderId}/${filename}`
}

/**
 * Converts a stored imagePath to an absolute filesystem path for reading.
 */
export function resolveImagePath(imagePath: string): string {
  if (imagePath.startsWith('/api/images/')) {
    // Electron mode: file is in userData/uploads/
    const relative = imagePath.slice('/api/images/'.length)
    const userData = process.env.ELECTRON_USER_DATA
    if (!userData) throw new Error('ELECTRON_USER_DATA not set')
    return path.join(userData, 'uploads', relative)
  }
  // Web mode: file is in public/
  return path.join(process.cwd(), 'public', imagePath)
}
