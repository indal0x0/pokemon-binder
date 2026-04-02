import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

function createPrismaClient() {
  const dbPath = (process.env.DATABASE_URL ?? 'file:./dev.db').replace('file:', '')
  const absoluteDbPath = path.resolve(process.cwd(), dbPath)
  const adapter = new PrismaBetterSqlite3({ url: absoluteDbPath })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
