/**
 * SQLite database layer for the Electron main process.
 * Uses better-sqlite3 (synchronous) with all operations exposed as IPC handlers.
 */

const crypto = require('crypto')

let db = null

function uid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

// ─── Initialisation ──────────────────────────────────────────────────────────

function initDb(Database, dbPath) {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS binders (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      description    TEXT,
      coverColor     TEXT,
      coverImagePath TEXT,
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
      createdAt       TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt       TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Idempotent migrations for older databases
  const migrations = [
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
  ]
  for (const sql of migrations) {
    try { db.exec(sql) } catch { /* already exists */ }
  }

  return db
}

// ─── Binders ─────────────────────────────────────────────────────────────────

function getBinders() {
  const binders = db.prepare('SELECT * FROM binders ORDER BY createdAt DESC').all()
  return binders.map(b => {
    const cards = db.prepare('SELECT quantity, priceMarket FROM binder_cards WHERE binderId = ?').all(b.id)
    const pages = db.prepare('SELECT COUNT(*) as count FROM pages WHERE binderId = ?').get(b.id)
    const totalValue = cards.reduce((sum, c) => sum + (c.priceMarket || 0) * c.quantity, 0)
    const cardCount = cards.reduce((sum, c) => sum + c.quantity, 0)
    return { ...b, totalValue, cardCount, pageCount: pages.count }
  })
}

function getBinderById(id) {
  const binder = db.prepare('SELECT * FROM binders WHERE id = ?').get(id)
  if (!binder) return null
  const pages = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM binder_cards WHERE pageId = p.id) as cardCount,
      (SELECT imageUrl FROM binder_cards WHERE pageId = p.id ORDER BY COALESCE(position, 9999) ASC, createdAt ASC LIMIT 1) as firstCardImageUrl
    FROM pages p WHERE binderId = ? ORDER BY position ASC, pageNumber ASC
  `).all(id)
  const cards = db.prepare('SELECT * FROM binder_cards WHERE binderId = ? ORDER BY createdAt ASC').all(id)
  const totalValue = cards.reduce((sum, c) => sum + (c.priceMarket || 0) * c.quantity, 0)
  const cardCount = cards.reduce((sum, c) => sum + c.quantity, 0)
  return { ...binder, pages, cards, totalValue, cardCount }
}

function createBinder({ name, description, coverColor, coverImagePath, coverPattern, coverPreset }) {
  const id = uid()
  const ts = now()
  db.prepare('INSERT INTO binders (id, name, description, coverColor, coverImagePath, coverPattern, coverPreset, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, description || null, coverColor || null, coverImagePath || null, coverPattern || null, coverPreset || null, ts, ts)
  return db.prepare('SELECT * FROM binders WHERE id = ?').get(id)
}

function updateBinder(id, updates) {
  const { name, description } = updates
  // Build SET clause — cover fields can be explicitly nulled to clear them
  const parts = [
    'name = COALESCE(?, name)',
    'description = COALESCE(?, description)',
    'updatedAt = ?',
  ]
  const params = [name ?? null, description ?? null, now()]

  if ('coverColor' in updates) { parts.push('coverColor = ?'); params.push(updates.coverColor ?? null) }
  if ('coverImagePath' in updates) { parts.push('coverImagePath = ?'); params.push(updates.coverImagePath ?? null) }
  if ('coverPattern' in updates) { parts.push('coverPattern = ?'); params.push(updates.coverPattern ?? null) }
  if ('coverPreset' in updates) { parts.push('coverPreset = ?'); params.push(updates.coverPreset ?? null) }

  params.push(id)
  db.prepare(`UPDATE binders SET ${parts.join(', ')} WHERE id = ?`).run(...params)
  return db.prepare('SELECT * FROM binders WHERE id = ?').get(id)
}

function deleteBinder(id) {
  db.prepare('DELETE FROM binders WHERE id = ?').run(id)
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function getPages(binderId) {
  return db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM binder_cards WHERE pageId = p.id) as cardCount,
      (SELECT imageUrl FROM binder_cards WHERE pageId = p.id ORDER BY COALESCE(position, 9999) ASC, createdAt ASC LIMIT 1) as firstCardImageUrl
    FROM pages p WHERE binderId = ? ORDER BY position ASC, pageNumber ASC
  `).all(binderId)
}

function getPageById(pageId) {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId)
  if (!page) return null
  const cards = db.prepare('SELECT * FROM binder_cards WHERE pageId = ? ORDER BY COALESCE(position, 9999) ASC, createdAt ASC').all(pageId)
  return { ...page, cards }
}

function createPage({ binderId, name, imagePath, status, cols, rows }) {
  const id = uid()
  const ts = now()
  const count = db.prepare('SELECT COUNT(*) as c FROM pages WHERE binderId = ?').get(binderId).c
  const pageNumber = count + 1
  db.prepare(`
    INSERT INTO pages (id, binderId, pageNumber, position, name, imagePath, status, cols, rows, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, binderId, pageNumber, pageNumber, name || `Page ${pageNumber}`, imagePath || '', status || 'pending', cols || 3, rows || 3, ts)
  return db.prepare('SELECT * FROM pages WHERE id = ?').get(id)
}

function updatePage(id, { name, position, status, rawAiOutput, processedAt, cols, rows }) {
  db.prepare(`
    UPDATE pages SET
      name         = COALESCE(?, name),
      position     = COALESCE(?, position),
      status       = COALESCE(?, status),
      rawAiOutput  = COALESCE(?, rawAiOutput),
      processedAt  = COALESCE(?, processedAt),
      cols         = COALESCE(?, cols),
      rows         = COALESCE(?, rows)
    WHERE id = ?
  `).run(name ?? null, position ?? null, status ?? null, rawAiOutput ?? null, processedAt ?? null, cols ?? null, rows ?? null, id)
  return db.prepare('SELECT * FROM pages WHERE id = ?').get(id)
}

function deletePage(id) {
  const page = db.prepare('SELECT imagePath FROM pages WHERE id = ?').get(id)
  db.prepare('DELETE FROM binder_cards WHERE pageId = ?').run(id)
  db.prepare('DELETE FROM pages WHERE id = ?').run(id)
  return page?.imagePath || null
}

function reorderPages(binderId, orderedIds) {
  const update = db.prepare('UPDATE pages SET position = ? WHERE id = ? AND binderId = ?')
  const updateMany = db.transaction((ids) => {
    ids.forEach((pageId, index) => update.run(index, pageId, binderId))
  })
  updateMany(orderedIds)
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function getCards(binderId, pageId) {
  if (pageId) {
    return db.prepare('SELECT * FROM binder_cards WHERE binderId = ? AND pageId = ? ORDER BY COALESCE(position, 9999) ASC, createdAt ASC').all(binderId, pageId)
  }
  return db.prepare('SELECT * FROM binder_cards WHERE binderId = ? ORDER BY createdAt ASC').all(binderId)
}

function createCard(data) {
  // Auto-assign position if card belongs to a page and no position given
  let position = data.position ?? null
  if (data.pageId && position === null) {
    const existing = db.prepare('SELECT COUNT(*) as c FROM binder_cards WHERE pageId = ?').get(data.pageId)
    position = existing.c
  }

  const id = uid()
  const ts = now()
  db.prepare(`
    INSERT INTO binder_cards
      (id, binderId, pageId, tcgApiId, name, setId, setName, collectorNumber, rarity, imageUrl,
       priceLow, priceMid, priceMarket, priceHigh, priceUpdatedAt, quantity, condition, tradeList, position, year, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.binderId, data.pageId ?? null, data.tcgApiId, data.name,
    data.setId || 'unknown', data.setName || 'Unknown Set', data.collectorNumber || '',
    data.rarity ?? null, data.imageUrl ?? null,
    data.priceLow ?? null, data.priceMid ?? null, data.priceMarket ?? null, data.priceHigh ?? null,
    data.priceUpdatedAt ?? null,
    data.quantity ?? 1, data.condition ?? null, data.tradeList ? 1 : 0,
    position,
    data.year ?? null,
    ts, ts
  )
  return db.prepare('SELECT * FROM binder_cards WHERE id = ?').get(id)
}

function updateCard(id, data) {
  const { quantity, condition, tradeList, imageUrl } = data
  const parts = [
    'quantity  = COALESCE(?, quantity)',
    'condition = COALESCE(?, condition)',
    'tradeList = COALESCE(?, tradeList)',
    'updatedAt = ?',
  ]
  const params = [quantity ?? null, condition ?? null, tradeList != null ? (tradeList ? 1 : 0) : null, now()]
  if ('imageUrl' in data) { parts.push('imageUrl = ?'); params.push(imageUrl ?? null) }
  params.push(id)
  db.prepare(`UPDATE binder_cards SET ${parts.join(', ')} WHERE id = ?`).run(...params)
  return db.prepare('SELECT * FROM binder_cards WHERE id = ?').get(id)
}

function deleteCard(id) {
  db.prepare('DELETE FROM binder_cards WHERE id = ?').run(id)
}

function getCardsForRefresh(binderId) {
  return db.prepare(`
    SELECT * FROM binder_cards
    WHERE binderId = ? AND tcgApiId NOT LIKE 'unmatched-%'
  `).all(binderId)
}

function updateCardPrices(id, prices) {
  db.prepare(`
    UPDATE binder_cards SET
      priceLow = ?, priceMid = ?, priceMarket = ?, priceHigh = ?, priceUpdatedAt = ?, updatedAt = ?
    WHERE id = ?
  `).run(prices.priceLow, prices.priceMid, prices.priceMarket, prices.priceHigh, prices.priceUpdatedAt, now(), id)
}

function reorderPageCards(pageId, positions) {
  // positions: [{id, position}]
  const update = db.prepare('UPDATE binder_cards SET position = ?, updatedAt = ? WHERE id = ? AND pageId = ?')
  const ts = now()
  const updateMany = db.transaction((items) => {
    for (const { id, position } of items) {
      update.run(position, ts, id, pageId)
    }
  })
  updateMany(positions)
}

function moveCard(cardId, pageId, position) {
  db.prepare('UPDATE binder_cards SET pageId = ?, position = ?, updatedAt = ? WHERE id = ?')
    .run(pageId, position, now(), cardId)
}

module.exports = {
  initDb,
  getBinders, getBinderById, createBinder, updateBinder, deleteBinder,
  getPages, getPageById, createPage, updatePage, deletePage, reorderPages,
  getCards, createCard, updateCard, deleteCard, getCardsForRefresh, updateCardPrices,
  reorderPageCards, moveCard,
}
