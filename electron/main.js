const { app, BrowserWindow, ipcMain, protocol, net, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

// ─── Protocol must be registered BEFORE app is ready ─────────────────────────
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

// ─── Electron-store ───────────────────────────────────────────────────────────
const store = new Store({
  schema: {
    settings: {
      type: 'object',
      properties: {
        geminiApiKey: { type: 'string', default: '' },
        pokemonTcgApiKey: { type: 'string', default: '' },
      },
      default: {},
    },
  },
})

const isDev = !app.isPackaged
let mainWindow = null
let db = null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserDataPath(...segments) {
  return path.join(app.getPath('userData'), ...segments)
}

function ensureDir(...segments) {
  fs.mkdirSync(getUserDataPath(...segments), { recursive: true })
}

function getSettings() {
  return store.get('settings', {})
}

// ─── Database init ────────────────────────────────────────────────────────────

function initDatabase() {
  const Database = require('better-sqlite3')
  const dbPath = getUserDataPath('pokemon-binder.db')
  const { initDb } = require('./db')
  db = initDb(Database, dbPath)
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Pokemon Binder',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    mainWindow.loadURL('app://./index.html')
  }

  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'F12') mainWindow.webContents.openDevTools()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── Protocol handler (production only) ──────────────────────────────────────

function registerAppProtocol() {
  const outDir = path.join(app.getAppPath(), 'out')
  const uploadsDir = getUserDataPath('uploads')
  const coversDir = getUserDataPath('covers')

  protocol.handle('app', (request) => {
    let urlPath = new URL(request.url).pathname
    // Decode percent-encoding
    urlPath = decodeURIComponent(urlPath)

    // User-uploaded images: app://./uploads/binderId/filename
    if (urlPath.startsWith('/uploads/')) {
      const filePath = path.join(uploadsDir, urlPath.slice('/uploads/'.length))
      return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`)
    }

    // Binder cover images: app://./covers/binderId/cover.ext
    if (urlPath.startsWith('/covers/')) {
      const filePath = path.join(coversDir, urlPath.slice('/covers/'.length))
      return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`)
    }

    // Static Next.js export files
    let filePath = path.join(outDir, urlPath)

    // If path is a directory, try index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }

    // If file doesn't exist, fall back to root index.html (client-side routing)
    if (!fs.existsSync(filePath)) {
      filePath = path.join(outDir, 'index.html')
    }

    return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`)
  })
}

// ─── IPC: Settings ────────────────────────────────────────────────────────────

ipcMain.handle('settings:get', () => getSettings())

ipcMain.handle('settings:set', (_, newSettings) => {
  store.set('settings', newSettings)
  return true
})

ipcMain.handle('app:userData', () => app.getPath('userData'))

// ─── IPC: Binder covers ───────────────────────────────────────────────────────

ipcMain.handle('binders:upload-cover', (_, binderId, filename, arrayBuffer) => {
  const coversDir = getUserDataPath('covers', binderId)
  fs.mkdirSync(coversDir, { recursive: true })
  const ext = path.extname(filename) || '.jpg'
  const destPath = path.join(coversDir, `cover${ext}`)
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer))
  return `covers/${binderId}/cover${ext}`
})

// ─── IPC: Binders ─────────────────────────────────────────────────────────────

ipcMain.handle('binders:list', () => {
  const { getBinders } = require('./db')
  return getBinders()
})

ipcMain.handle('binders:get', (_, id) => {
  const { getBinderById } = require('./db')
  return getBinderById(id)
})

ipcMain.handle('binders:create', (_, data) => {
  const { createBinder } = require('./db')
  return createBinder(data)
})

ipcMain.handle('binders:update', (_, id, data) => {
  const { updateBinder } = require('./db')
  return updateBinder(id, data)
})

ipcMain.handle('binders:delete', (_, id) => {
  const { deleteBinder } = require('./db')
  deleteBinder(id)
  // Also remove uploaded images for this binder
  const binderUploads = getUserDataPath('uploads', id)
  if (fs.existsSync(binderUploads)) {
    fs.rmSync(binderUploads, { recursive: true, force: true })
  }
  return true
})

// ─── IPC: Pages ───────────────────────────────────────────────────────────────

ipcMain.handle('pages:list', (_, binderId) => {
  const { getPages } = require('./db')
  return getPages(binderId)
})

ipcMain.handle('pages:get', (_, pageId) => {
  const { getPageById } = require('./db')
  return getPageById(pageId)
})

ipcMain.handle('pages:create', (_, data) => {
  const { createPage } = require('./db')
  return createPage(data)
})

ipcMain.handle('pages:update', (_, pageId, data) => {
  const { updatePage } = require('./db')
  return updatePage(pageId, data)
})

ipcMain.handle('pages:delete', (_, pageId) => {
  const { deletePage } = require('./db')
  const imagePath = deletePage(pageId)
  // Delete the image file if there was one
  if (imagePath) {
    const abs = path.join(getUserDataPath('uploads'), imagePath.replace(/^uploads[/\\]?/, ''))
    if (fs.existsSync(abs)) fs.unlinkSync(abs)
  }
  return true
})

ipcMain.handle('pages:reorder', (_, binderId, orderedIds) => {
  const { reorderPages } = require('./db')
  reorderPages(binderId, orderedIds)
  return true
})

ipcMain.handle('pages:reorder-cards', (_, pageId, positions) => {
  const { reorderPageCards } = require('./db')
  reorderPageCards(pageId, positions)
  return true
})

ipcMain.handle('pages:move-cards', (_, cardIds, targetPageId) => {
  const { moveCard } = require('./db')
  cardIds.forEach((cardId, idx) => moveCard(cardId, targetPageId, idx))
  return true
})

// ─── IPC: Cards ───────────────────────────────────────────────────────────────

ipcMain.handle('cards:list', (_, binderId, pageId) => {
  const { getCards } = require('./db')
  return getCards(binderId, pageId || undefined)
})

ipcMain.handle('cards:create', async (_, data) => {
  const { createCard, updateCardPrices } = require('./db')
  const { fetchCardPrices } = require('./tcg')
  const card = createCard(data)
  // Fetch prices immediately if we have a TCG ID
  if (card && card.tcgApiId && !card.tcgApiId.startsWith('unmatched-')) {
    try {
      const prices = await fetchCardPrices(card.tcgApiId)
      if (prices) {
        updateCardPrices(card.id, prices)
        return { ...card, ...prices }
      }
    } catch { /* price fetch failed, return card without prices */ }
  }
  return card
})

ipcMain.handle('cards:update', (_, id, data) => {
  const { updateCard } = require('./db')
  return updateCard(id, data)
})

ipcMain.handle('cards:delete', (_, id) => {
  const { deleteCard } = require('./db')
  deleteCard(id)
  return true
})

ipcMain.handle('cards:refresh-prices', async (_, binderId) => {
  const { getCardsForRefresh, updateCardPrices } = require('./db')
  const { refreshCardPrices } = require('./tcg')

  const cards = getCardsForRefresh(binderId)
  let updated = 0
  for (const card of cards) {
    try {
      const prices = await refreshCardPrices(card.tcgApiId)
      if (prices) {
        updateCardPrices(card.id, prices)
        updated++
      }
    } catch { /* skip failed cards */ }
  }
  return { updated }
})

// ─── IPC: Image upload ────────────────────────────────────────────────────────

ipcMain.handle('upload:image', (_, binderId, filename, arrayBuffer) => {
  ensureDir('uploads', binderId)
  const safeFilename = path.basename(filename)
  const destPath = getUserDataPath('uploads', binderId, safeFilename)
  const buffer = Buffer.from(arrayBuffer)
  fs.writeFileSync(destPath, buffer)
  // Return the relative path stored in DB (no leading slash)
  return `uploads/${binderId}/${safeFilename}`
})

// ─── IPC: TCG full card pricing ──────────────────────────────────────────────

ipcMain.handle('tcg:get-card-prices', async (_, tcgApiId) => {
  const { getFullCardPricing } = require('./tcg')
  return getFullCardPricing(tcgApiId)
})

ipcMain.handle('tcg:get-prices-batch', async (_, tcgApiIds) => {
  const { getCardPricesBatch } = require('./tcg')
  return getCardPricesBatch(tcgApiIds)
})

// ─── IPC: Card custom image upload ───────────────────────────────────────────

ipcMain.handle('cards:upload-card-image', (_, cardId, binderId, filename, arrayBuffer) => {
  const cardsDir = getUserDataPath('uploads', binderId, 'cards')
  fs.mkdirSync(cardsDir, { recursive: true })
  const ext = path.extname(filename) || '.jpg'
  const destPath = path.join(cardsDir, `${cardId}${ext}`)
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer))
  const relativePath = `uploads/${binderId}/cards/${cardId}${ext}`
  const { updateCard } = require('./db')
  return updateCard(cardId, { imageUrl: relativePath })
})

// ─── IPC: Scanning ────────────────────────────────────────────────────────────

ipcMain.handle('scan:page', async (_, binderId, pageId, imagePath) => {
  const { identifyCardsOnPage } = require('./scanner')
  const { matchCard } = require('./tcg')
  const { createCard, updatePage } = require('./db')

  const settings = getSettings()
  const geminiKey = settings.geminiApiKey || ''
  const tcgApiKey = settings.pokemonTcgApiKey || ''

  if (!geminiKey) throw new Error('Gemini API key not set. Go to Settings to add it.')

  // Resolve absolute path from stored relative path
  const absImagePath = imagePath.startsWith('uploads/')
    ? getUserDataPath(imagePath)
    : imagePath

  const { cards: identified, rawText } = await identifyCardsOnPage(absImagePath, geminiKey)

  // Update page with raw AI output
  updatePage(pageId, {
    rawAiOutput: rawText,
    processedAt: new Date().toISOString(),
    status: 'done',
  })

  const saved = []
  for (const card of identified) {
    let tcgData = null
    try {
      tcgData = await matchCard(card, tcgApiKey)
    } catch { /* no TCG match */ }

    const row = createCard({
      binderId,
      pageId,
      tcgApiId: tcgData?.tcgApiId || `unmatched-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: tcgData?.name || card.name,
      setId: tcgData?.setId || 'unknown',
      setName: tcgData?.setName || card.setName || 'Unknown Set',
      collectorNumber: tcgData?.collectorNumber || card.collectorNumber || '',
      rarity: tcgData?.rarity || null,
      imageUrl: tcgData?.imageUrl || null,
      priceLow: tcgData?.priceLow ?? null,
      priceMid: tcgData?.priceMid ?? null,
      priceMarket: tcgData?.priceMarket ?? null,
      priceHigh: tcgData?.priceHigh ?? null,
      priceUpdatedAt: tcgData?.priceUpdatedAt ?? null,
      quantity: card.quantity || 1,
      condition: card.condition || null,
      tradeList: false,
    })
    saved.push(row)
  }

  return { cards: saved, count: saved.length }
})

// ─── IPC: TCG card search ─────────────────────────────────────────────────────

ipcMain.handle('tcg:search', async (_, query, page = 1) => {
  const { searchCards } = require('./tcg')
  return searchCards(query, page)
})

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  ensureDir('uploads')

  if (!isDev) {
    registerAppProtocol()
  }

  try {
    initDatabase()
    createWindow()
  } catch (err) {
    console.error('Failed to start Pokemon Binder:', err)
    dialog.showErrorBox('Failed to start', String(err))
    app.quit()
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
})
