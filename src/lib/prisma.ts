import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

function getDbPath(): string {
  // When running inside Electron, the main process sets ELECTRON_USER_DATA
  // to the app's persistent data directory. Use that for the database.
  if (process.env.ELECTRON_USER_DATA) {
    return path.join(process.env.ELECTRON_USER_DATA, 'pokemon-binder.db')
  }
  // Fallback: use DATABASE_URL or default to ./dev.db
  const url = process.env.DATABASE_URL ?? 'file:./dev.db'
  return path.resolve(process.cwd(), url.replace('file:', ''))
}

function createPrismaClient() {
  const dbPath = getDbPath()
  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
