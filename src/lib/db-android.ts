/**
 * SQLite database layer for Android/Capacitor.
 * Ported from electron/db.js — async version using @capacitor-community/sqlite.
 */

import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { createId } from '@paralleldrive/cuid2'
import type { BinderRow, PageRow, CardRow, SlabRow, WishlistCard } from '@/types/electron'

const sqlite = new SQLiteConnection(CapacitorSQLite)
let _db: any = null

function uid() { return createId() }
function now() { return new Date().toISOString() }

const CONDITION_MULTIPLIERS: Record<string, number> = { NM: 1.0, LP: 0.8, MP: 0.6, HP: 0.4, DMG: 0.2 }

export async function getDb() {
  if (_db) return _db

  const ret = await sqlite.checkConnectionsConsistency()
  const isConn = (await sqlite.isConnection('offdex', false)).result

  if (ret.result && isConn) {
    _db = await sqlite.retrieveConnection('offdex', false)
  } else {
    _db = await sqlite.createConnection('offdex', false, 'no-encryption', 1, false)
  }

  await _db.open()
  await runMigrations(_db)
  return _db
}

async function runMigrations(db: any) {
  await db.execute(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS slabs (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      gradingCompany TEXT NOT NULL DEFAULT '',
      grade          TEXT NOT NULL DEFAULT '',
      certNumber     TEXT,
      pricePaid      REAL,
      currentPrice   REAL,
      imageUrl       TEXT,
      createdAt      TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS binders (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      description    TEXT,
      coverColor     TEXT,
      coverImagePath TEXT,
      coverPattern   TEXT,
      coverPreset    TEXT,
      createdAt      TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pages (
      id           TEXT PRIMARY KEY,
      binderId     TEXT NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
      pageNumber   INTEGER NOT NULL DEFAULT 1,
      position     INTEGER NOT NULL DEFAULT 0,
      name         TEXT NOT NULL DEFAULT '',
      imagePath    TEXT NOT NULL DEFAULT '',
      rawAiOutput  TEXT,
      processedAt  TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      cols         INTEGER NOT NULL DEFAULT 3,
      rows         INTEGER NOT NULL DEFAULT 3,
      createdAt    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS binder_cards (
      id              TEXT PRIMARY KEY,
      binderId        TEXT NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
      pageId          TEXT REFERENCES pages(id) ON DELETE SET NULL,
      tcgApiId        TEXT NOT NULL,
      name            TEXT NOT NULL,
      setId           TEXT NOT NULL DEFAULT 'unknown',
      setName         TEXT NOT NULL DEFAULT 'Unknown Set',
      collectorNumber TEXT NOT NULL DEFAULT '',
      rarity          TEXT,
      imageUrl        TEXT,
      priceLow        REAL,
      priceMid        REAL,
      priceMarket     REAL,
      priceHigh       REAL,
      priceUpdatedAt  TEXT,
      quantity        INTEGER NOT NULL DEFAULT 1,
      condition       TEXT,
      tradeList       INTEGER NOT NULL DEFAULT 0,
      position        INTEGER,
      year            INTEGER,
      priceBase       REAL,
      purchasedPrice  REAL,
      isCustom        INTEGER NOT NULL DEFAULT 0,
      cardGame        TEXT NOT NULL DEFAULT 'pokemon',
      createdAt       TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlist_cards (
      id              TEXT PRIMARY KEY,
      tcgApiId        TEXT NOT NULL,
      name            TEXT NOT NULL,
      setId           TEXT NOT NULL DEFAULT '',
      setName         TEXT NOT NULL DEFAULT '',
      collectorNumber TEXT NOT NULL DEFAULT '',
      imageUrl        TEXT,
      cardGame        TEXT NOT NULL DEFAULT 'pokemon',
      priority        TEXT NOT NULL DEFAULT 'medium',
      notes           TEXT,
      createdAt       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bc_binderId  ON binder_cards(binderId);
    CREATE INDEX IF NOT EXISTS idx_bc_pageId    ON binder_cards(pageId);
    CREATE INDEX IF NOT EXISTS idx_bc_tcgApiId  ON binder_cards(tcgApiId);
    CREATE INDEX IF NOT EXISTS idx_pages_binder ON pages(binderId);
    CREATE INDEX IF NOT EXISTS idx_slabs_createdAt ON slabs(createdAt);
  `)

  // Idempotent migrations — each runs independently so one failure doesn't block others
  const alterMigrations = [
    `ALTER TABLE pages ADD COLUMN position INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE pages ADD COLUMN name TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE pages ADD COLUMN cols INTEGER NOT NULL DEFAULT 3`,
    `ALTER TABLE pages ADD COLUMN rows INTEGER NOT NULL DEFAULT 3`,
    `ALTER TABLE binder_cards ADD COLUMN tradeList INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE binder_cards ADD COLUMN position INTEGER`,
    `ALTER TABLE binders ADD COLUMN coverColor TEXT`,
    `ALTER TABLE binders ADD COLUMN coverImagePath TEXT`,
    `ALTER TABLE binders ADD COLUMN coverPattern TEXT`,
    `ALTER TABLE binders ADD COLUMN coverPreset TEXT`,
    `ALTER TABLE binder_cards ADD COLUMN year INTEGER`,
    `ALTER TABLE binder_cards ADD COLUMN priceBase REAL`,
    `ALTER TABLE binder_cards ADD COLUMN purchasedPrice REAL`,
    `ALTER TABLE binder_cards ADD COLUMN isCustom INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE binder_cards ADD COLUMN cardGame TEXT NOT NULL DEFAULT 'pokemon'`,
  ]
  for (const sql of alterMigrations) {
    try { await db.run(sql, []) } catch { /* already exists */ }
  }
}

// ─── Binders ──────────────────────────────────────────────────────────────────

export async function getBinders(): Promise<BinderRow[]> {
  const db = await getDb()
  const res = await db.query(`
    SELECT b.*,
      COALESCE(SUM(bc.quantity * bc.priceMarket), 0) AS totalValue,
      COALESCE(SUM(bc.quantity), 0)                  AS cardCount,
      COUNT(DISTINCT p.id)                           AS pageCount
    FROM binders b
    LEFT JOIN binder_cards bc ON bc.binderId = b.id
    LEFT JOIN pages        p  ON p.binderId  = b.id
    GROUP BY b.id
    ORDER BY b.createdAt DESC
  `, [])
  return res.values ?? []
}

export async function getBinderById(id: string): Promise<(BinderRow & { pages: PageRow[]; cards: CardRow[]; totalValue: number; cardCount: number }) | null> {
  const db = await getDb()
  const binderRes = await db.query('SELECT * FROM binders WHERE id = ?', [id])
  const binder = binderRes.values?.[0]
  if (!binder) return null

  const pagesRes = await db.query(`
    SELECT p.*,
      (SELECT COUNT(*) FROM binder_cards WHERE pageId = p.id) as cardCount,
      (SELECT imageUrl FROM binder_cards WHERE pageId = p.id ORDER BY COALESCE(position, 9999) ASC, createdAt ASC LIMIT 1) as firstCardImageUrl
    FROM pages p WHERE binderId = ? ORDER BY position ASC, pageNumber ASC
  `, [id])

  const cardsRes = await db.query(
    'SELECT * FROM binder_cards WHERE binderId = ? ORDER BY createdAt ASC',
    [id],
  )

  const pages: PageRow[] = pagesRes.values ?? []
  const cards: CardRow[] = cardsRes.values ?? []
  const totalValue = cards.reduce((sum, c) => sum + ((c.priceMarket || 0) * c.quantity), 0)
  const cardCount = cards.reduce((sum, c) => sum + c.quantity, 0)

  return { ...binder, pages, cards, totalValue, cardCount }
}

export async function createBinder(data: { name: string; description?: string; coverColor?: string | null; coverImagePath?: string | null; coverPattern?: string | null; coverPreset?: string | null }): Promise<BinderRow> {
  const db = await getDb()
  const id = uid()
  const ts = now()
  await db.run(
    'INSERT INTO binders (id, name, description, coverColor, coverImagePath, coverPattern, coverPreset, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.description || null, data.coverColor || null, data.coverImagePath || null, data.coverPattern || null, data.coverPreset || null, ts, ts],
  )
  const res = await db.query('SELECT * FROM binders WHERE id = ?', [id])
  return res.values![0]
}

export async function updateBinder(id: string, updates: { name?: string; description?: string | null; coverColor?: string | null; coverImagePath?: string | null; coverPattern?: string | null; coverPreset?: string | null }): Promise<BinderRow> {
  const db = await getDb()
  const parts = ['name = COALESCE(?, name)', 'description = COALESCE(?, description)', 'updatedAt = ?']
  const params: any[] = [updates.name ?? null, updates.description ?? null, now()]

  if ('coverColor' in updates) { parts.push('coverColor = ?'); params.push(updates.coverColor ?? null) }
  if ('coverImagePath' in updates) { parts.push('coverImagePath = ?'); params.push(updates.coverImagePath ?? null) }
  if ('coverPattern' in updates) { parts.push('coverPattern = ?'); params.push(updates.coverPattern ?? null) }
  if ('coverPreset' in updates) { parts.push('coverPreset = ?'); params.push(updates.coverPreset ?? null) }

  params.push(id)
  await db.run(`UPDATE binders SET ${parts.join(', ')} WHERE id = ?`, params)
  const res = await db.query('SELECT * FROM binders WHERE id = ?', [id])
  return res.values![0]
}

export async function deleteBinder(id: string): Promise<boolean> {
  const db = await getDb()
  await db.run('DELETE FROM binders WHERE id = ?', [id])
  return true
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function getPages(binderId: string): Promise<PageRow[]> {
  const db = await getDb()
  const res = await db.query(`
    SELECT p.*,
      (SELECT COUNT(*) FROM binder_cards WHERE pageId = p.id) as cardCount,
      (SELECT imageUrl FROM binder_cards WHERE pageId = p.id ORDER BY COALESCE(position, 9999) ASC, createdAt ASC LIMIT 1) as firstCardImageUrl
    FROM pages p WHERE binderId = ? ORDER BY position ASC, pageNumber ASC
  `, [binderId])
  return res.values ?? []
}

export async function getPageById(pageId: string): Promise<(PageRow & { cards: CardRow[] }) | null> {
  const db = await getDb()
  const pageRes = await db.query('SELECT * FROM pages WHERE id = ?', [pageId])
  const page = pageRes.values?.[0]
  if (!page) return null
  const cardsRes = await db.query(
    'SELECT * FROM binder_cards WHERE pageId = ? ORDER BY COALESCE(position, 9999) ASC, createdAt ASC',
    [pageId],
  )
  return { ...page, cards: cardsRes.values ?? [] }
}

export async function createPage(data: { binderId: string; name?: string; imagePath?: string; status?: string; cols?: number; rows?: number }): Promise<PageRow> {
  const db = await getDb()
  const id = uid()
  const ts = now()
  const countRes = await db.query('SELECT COUNT(*) as c FROM pages WHERE binderId = ?', [data.binderId])
  const count = countRes.values?.[0]?.c ?? 0
  const pageNumber = count + 1
  await db.run(
    'INSERT INTO pages (id, binderId, pageNumber, position, name, imagePath, status, cols, rows, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.binderId, pageNumber, pageNumber, data.name || `Page ${pageNumber}`, data.imagePath || '', data.status || 'pending', data.cols || 3, data.rows || 3, ts],
  )
  const res = await db.query('SELECT * FROM pages WHERE id = ?', [id])
  return res.values![0]
}

export async function updatePage(id: string, data: { name?: string; position?: number; status?: string; rawAiOutput?: string; processedAt?: string; cols?: number; rows?: number; imagePath?: string }): Promise<PageRow> {
  const db = await getDb()
  await db.run(`
    UPDATE pages SET
      name         = COALESCE(?, name),
      position     = COALESCE(?, position),
      status       = COALESCE(?, status),
      rawAiOutput  = COALESCE(?, rawAiOutput),
      processedAt  = COALESCE(?, processedAt),
      cols         = COALESCE(?, cols),
      rows         = COALESCE(?, rows),
      imagePath    = COALESCE(?, imagePath)
    WHERE id = ?
  `, [data.name ?? null, data.position ?? null, data.status ?? null, data.rawAiOutput ?? null, data.processedAt ?? null, data.cols ?? null, data.rows ?? null, data.imagePath ?? null, id])
  const res = await db.query('SELECT * FROM pages WHERE id = ?', [id])
  return res.values![0]
}

export async function deletePage(id: string): Promise<boolean> {
  const db = await getDb()
  await db.run('DELETE FROM binder_cards WHERE pageId = ?', [id])
  await db.run('DELETE FROM pages WHERE id = ?', [id])
  return true
}

export async function reorderPages(binderId: string, orderedIds: string[]): Promise<boolean> {
  const db = await getDb()
  for (let i = 0; i < orderedIds.length; i++) {
    await db.run('UPDATE pages SET position = ? WHERE id = ? AND binderId = ?', [i, orderedIds[i], binderId])
  }
  return true
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export async function getCards(binderId: string, pageId?: string): Promise<CardRow[]> {
  const db = await getDb()
  if (pageId) {
    const res = await db.query(
      'SELECT * FROM binder_cards WHERE binderId = ? AND pageId = ? ORDER BY COALESCE(position, 9999) ASC, createdAt ASC',
      [binderId, pageId],
    )
    return res.values ?? []
  }
  const res = await db.query(
    'SELECT * FROM binder_cards WHERE binderId = ? ORDER BY createdAt ASC',
    [binderId],
  )
  return res.values ?? []
}

export async function createCard(data: Partial<CardRow>): Promise<CardRow> {
  const db = await getDb()
  let position = data.position ?? null
  if (data.pageId && position === null) {
    const res = await db.query('SELECT COUNT(*) as c FROM binder_cards WHERE pageId = ?', [data.pageId])
    position = res.values?.[0]?.c ?? 0
  }
  const id = uid()
  const ts = now()
  await db.run(`
    INSERT INTO binder_cards
      (id, binderId, pageId, tcgApiId, name, setId, setName, collectorNumber, rarity, imageUrl,
       priceLow, priceMid, priceMarket, priceHigh, priceUpdatedAt, quantity, condition, tradeList, position, year, isCustom, cardGame, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.binderId, data.pageId ?? null, data.tcgApiId, data.name,
    data.setId || 'unknown', data.setName || 'Unknown Set', data.collectorNumber || '',
    data.rarity ?? null, data.imageUrl ?? null,
    data.priceLow ?? null, data.priceMid ?? null, data.priceMarket ?? null, data.priceHigh ?? null,
    data.priceUpdatedAt ?? null,
    data.quantity ?? 1, data.condition ?? null, data.tradeList ? 1 : 0,
    position, data.year ?? null, data.isCustom ? 1 : 0, data.cardGame || 'pokemon', ts, ts,
  ])
  const res = await db.query('SELECT * FROM binder_cards WHERE id = ?', [id])
  return res.values![0]
}

export async function updateCard(id: string, data: Partial<CardRow> & { tradeList?: boolean }): Promise<CardRow> {
  const db = await getDb()

  // Handle condition change — recalculate priceMarket from priceBase
  if ('condition' in data && Object.keys(data).length === 1) {
    return updateCardCondition(id, data.condition ?? null)
  }

  const parts = [
    'quantity  = COALESCE(?, quantity)',
    'condition = COALESCE(?, condition)',
    'tradeList = COALESCE(?, tradeList)',
    'updatedAt = ?',
  ]
  const params: any[] = [data.quantity ?? null, data.condition ?? null, data.tradeList != null ? (data.tradeList ? 1 : 0) : null, now()]

  const directFields: (keyof CardRow)[] = ['name', 'setName', 'collectorNumber', 'imageUrl', 'purchasedPrice', 'priceMarket']
  for (const f of directFields) {
    if (f in data) { parts.push(`${f} = ?`); params.push(data[f] ?? null) }
  }
  if ('isCustom' in data) { parts.push('isCustom = ?'); params.push(data.isCustom ? 1 : 0) }
  params.push(id)

  await db.run(`UPDATE binder_cards SET ${parts.join(', ')} WHERE id = ?`, params)
  const res = await db.query('SELECT * FROM binder_cards WHERE id = ?', [id])
  return res.values![0]
}

async function updateCardCondition(id: string, condition: string | null): Promise<CardRow> {
  const db = await getDb()
  const cardRes = await db.query('SELECT priceBase, priceMarket, isCustom FROM binder_cards WHERE id = ?', [id])
  const card = cardRes.values?.[0]
  if (!card) throw new Error('Card not found')

  if (card.isCustom) {
    await db.run('UPDATE binder_cards SET condition = ?, updatedAt = ? WHERE id = ?', [condition ?? null, now(), id])
  } else {
    const base = card.priceBase ?? card.priceMarket
    const multiplier = condition ? (CONDITION_MULTIPLIERS[condition] ?? 1.0) : 1.0
    const newPrice = base != null ? Math.round(base * multiplier * 100) / 100 : null
    await db.run(
      'UPDATE binder_cards SET condition = ?, priceMarket = ?, priceBase = COALESCE(priceBase, ?), updatedAt = ? WHERE id = ?',
      [condition ?? null, newPrice, base ?? null, now(), id],
    )
  }

  const res = await db.query('SELECT * FROM binder_cards WHERE id = ?', [id])
  return res.values![0]
}

export async function deleteCard(id: string): Promise<boolean> {
  const db = await getDb()
  await db.run('DELETE FROM binder_cards WHERE id = ?', [id])
  return true
}

export async function reorderPageCards(pageId: string, positions: Array<{ id: string; position: number }>): Promise<boolean> {
  const db = await getDb()
  const ts = now()
  for (const { id, position } of positions) {
    await db.run('UPDATE binder_cards SET position = ?, updatedAt = ? WHERE id = ? AND pageId = ?', [position, ts, id, pageId])
  }
  return true
}

export async function moveCardsToPage(cardIds: string[], targetPageId: string): Promise<boolean> {
  const db = await getDb()
  const ts = now()
  for (let i = 0; i < cardIds.length; i++) {
    await db.run('UPDATE binder_cards SET pageId = ?, position = ?, updatedAt = ? WHERE id = ?', [targetPageId, i, ts, cardIds[i]])
  }
  return true
}

export async function updateCardPricesFull(id: string, pricing: any, condition: string | null, eurUsdRate: number): Promise<void> {
  const db = await getDb()
  const rate = eurUsdRate ?? 1.10
  const eurTrend = pricing.cardmarket?.trend ?? pricing.cardmarket?.avg ?? pricing.cardmarket?.avg7 ?? null
  const rawMarket = eurTrend != null ? Math.round(eurTrend * rate * 100) / 100 : null
  if (rawMarket == null) return
  const multiplier = condition ? (CONDITION_MULTIPLIERS[condition] ?? 1.0) : 1.0
  const adjustedMarket = Math.round(rawMarket * multiplier * 100) / 100
  const eurLow = pricing.cardmarket?.low ?? null
  const priceLow = eurLow != null ? Math.round(eurLow * rate * 100) / 100 : null
  await db.run(
    'UPDATE binder_cards SET priceLow = ?, priceMid = ?, priceMarket = ?, priceHigh = ?, priceUpdatedAt = ?, updatedAt = ?, priceBase = ? WHERE id = ?',
    [priceLow, null, adjustedMarket, null, new Date().toISOString(), now(), rawMarket, id],
  )
}

export async function getCardsForRefresh(binderId: string): Promise<CardRow[]> {
  const db = await getDb()
  const res = await db.query(
    `SELECT * FROM binder_cards WHERE binderId = ? AND tcgApiId NOT LIKE 'unmatched-%' AND isCustom = 0 AND cardGame = 'pokemon'`,
    [binderId],
  )
  return res.values ?? []
}

export async function getOpCardsForRefresh(binderId: string): Promise<CardRow[]> {
  const db = await getDb()
  const res = await db.query(
    `SELECT * FROM binder_cards WHERE binderId = ? AND isCustom = 0 AND cardGame = 'onepiece'`,
    [binderId],
  )
  return res.values ?? []
}

export async function updateOpCardPrice(id: string, priceMarket: number | null, priceLow: number | null): Promise<void> {
  const db = await getDb()
  await db.run(
    'UPDATE binder_cards SET priceMarket = ?, priceLow = ?, priceBase = ?, priceUpdatedAt = ?, updatedAt = ? WHERE id = ?',
    [priceMarket, priceLow, priceMarket, new Date().toISOString(), now(), id],
  )
}

// ─── Slabs ───────────────────────────────────��───────────────────────────���────

export async function getSlabs(): Promise<SlabRow[]> {
  const db = await getDb()
  const res = await db.query('SELECT * FROM slabs ORDER BY createdAt DESC', [])
  return res.values ?? []
}

export async function createSlab(data: { name: string; gradingCompany: string; grade: string; certNumber?: string | null; pricePaid?: number | null; currentPrice?: number | null; imageUrl?: string | null }): Promise<SlabRow> {
  const db = await getDb()
  const id = uid()
  const ts = now()
  await db.run(
    'INSERT INTO slabs (id, name, gradingCompany, grade, certNumber, pricePaid, currentPrice, imageUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.gradingCompany || '', data.grade || '', data.certNumber ?? null, data.pricePaid ?? null, data.currentPrice ?? null, data.imageUrl ?? null, ts, ts],
  )
  const res = await db.query('SELECT * FROM slabs WHERE id = ?', [id])
  return res.values![0]
}

export async function updateSlab(id: string, data: Partial<SlabRow>): Promise<SlabRow> {
  const db = await getDb()
  const parts = ['updatedAt = ?']
  const params: any[] = [now()]
  const fields: (keyof SlabRow)[] = ['name', 'gradingCompany', 'grade', 'certNumber', 'pricePaid', 'currentPrice', 'imageUrl']
  for (const f of fields) {
    if (f in data) { parts.push(`${f} = ?`); params.push(data[f] ?? null) }
  }
  params.push(id)
  await db.run(`UPDATE slabs SET ${parts.join(', ')} WHERE id = ?`, params)
  const res = await db.query('SELECT * FROM slabs WHERE id = ?', [id])
  return res.values![0]
}

export async function deleteSlab(id: string): Promise<boolean> {
  const db = await getDb()
  await db.run('DELETE FROM slabs WHERE id = ?', [id])
  return true
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function getWishlistCards(): Promise<WishlistCard[]> {
  const db = await getDb()
  const res = await db.query('SELECT * FROM wishlist_cards ORDER BY createdAt DESC', [])
  return res.values ?? []
}

export async function createWishlistCard(data: { tcgApiId: string; name: string; setId: string; setName: string; collectorNumber: string; imageUrl?: string | null; cardGame: string; priority?: string; notes?: string | null }): Promise<WishlistCard> {
  const db = await getDb()
  const id = uid()
  const ts = now()
  await db.run(
    'INSERT INTO wishlist_cards (id, tcgApiId, name, setId, setName, collectorNumber, imageUrl, cardGame, priority, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.tcgApiId, data.name, data.setId || '', data.setName || '', data.collectorNumber || '', data.imageUrl ?? null, data.cardGame || 'pokemon', data.priority || 'medium', data.notes ?? null, ts],
  )
  const res = await db.query('SELECT * FROM wishlist_cards WHERE id = ?', [id])
  return res.values![0]
}

export async function updateWishlistCard(id: string, data: { priority?: string; notes?: string | null }): Promise<WishlistCard> {
  const db = await getDb()
  const parts: string[] = []
  const params: any[] = []
  if ('priority' in data) { parts.push('priority = ?'); params.push(data.priority) }
  if ('notes' in data) { parts.push('notes = ?'); params.push(data.notes ?? null) }
  if (parts.length > 0) {
    params.push(id)
    await db.run(`UPDATE wishlist_cards SET ${parts.join(', ')} WHERE id = ?`, params)
  }
  const res = await db.query('SELECT * FROM wishlist_cards WHERE id = ?', [id])
  return res.values![0]
}

export async function deleteWishlistCard(id: string): Promise<boolean> {
  const db = await getDb()
  await db.run('DELETE FROM wishlist_cards WHERE id = ?', [id])
  return true
}
