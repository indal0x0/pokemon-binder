const { app, BrowserWindow, ipcMain, protocol, net, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

// ─── Protocol must be registered BEFORE app is ready ─────────────────────────
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

// ─── Electron-store ───────────────────────────────────────────────────────────
const store = new Store()

const isDev = !app.isPackaged
let mainWindow = null
let db = null

// ─── Preserve user data from old "Pokemon Binder" app name ───────────────────
// If the legacy data folder exists, keep using it so existing collections survive the rename.
;(() => {
  const oldPath = path.join(app.getPath('appData'), 'Pokemon Binder')
  if (fs.existsSync(oldPath)) {
    app.setPath('userData', oldPath)
  }
})()

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
    title: 'OffDex',
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
ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url))

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

ipcMain.handle('cards:cleanup-pocket', () => {
  const { deletePocketCards } = require('./db')
  return deletePocketCards()
})

ipcMain.handle('cards:create', async (_, data) => {
  const { createCard, updateCardPricesFull } = require('./db')
  const { getFullCardPricing, fetchEurUsdRate, isPocketCard } = require('./tcg')
  // Reject TCG Pocket cards at the IPC boundary
  if (data?.tcgApiId && isPocketCard(String(data.tcgApiId))) {
    throw new Error('TCG Pocket cards cannot be added to binders')
  }
  const card = createCard(data)
  // Fetch cardmarket EUR prices immediately if we have a TCG ID (skip for custom cards)
  if (card && card.tcgApiId && !card.tcgApiId.startsWith('unmatched-') && !card.isCustom) {
    try {
      const [pricing, eurUsdRate] = await Promise.all([
        getFullCardPricing(card.tcgApiId),
        fetchEurUsdRate(),
      ])
      const hasEur = pricing?.cardmarket?.trend != null || pricing?.cardmarket?.avg != null || pricing?.cardmarket?.avg7 != null
      if (pricing && hasEur) {
        updateCardPricesFull(card.id, pricing, card.condition, eurUsdRate)
        return require('./db').getCardsByIds([card.id])[0] ?? card
      }
    } catch { /* price fetch failed, return card without prices */ }
  }
  return card
})

ipcMain.handle('cards:update', (_, id, data) => {
  const { updateCard, updateCardCondition } = require('./db')
  if ('condition' in data) {
    // Recalculate priceMarket based on condition multiplier
    const updated = updateCardCondition(id, data.condition)
    // Apply any other fields too if present
    const rest = { ...data }
    delete rest.condition
    if (Object.keys(rest).length > 0) return updateCard(id, rest) ?? updated
    return updated
  }
  return updateCard(id, data)
})

ipcMain.handle('cards:delete', (_, id) => {
  const { deleteCard } = require('./db')
  deleteCard(id)
  return true
})

ipcMain.handle('cards:refresh-prices', async (event, binderId) => {
  const { getCardsForRefresh, updateCardPricesFull } = require('./db')
  const { getFullCardPricing, fetchEurUsdRate } = require('./tcg')

  const eurUsdRate = await fetchEurUsdRate()
  const cards = getCardsForRefresh(binderId)
  let updated = 0
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    event.sender.send('prices:progress', { current: i, total: cards.length, name: card.name })
    try {
      const pricing = await getFullCardPricing(card.tcgApiId)
      const hasEur = pricing?.cardmarket?.trend != null || pricing?.cardmarket?.avg != null || pricing?.cardmarket?.avg7 != null
      if (pricing && hasEur) {
        updateCardPricesFull(card.id, pricing, card.condition, eurUsdRate)
        updated++
      }
    } catch { /* skip failed cards */ }
  }
  event.sender.send('prices:progress', { current: cards.length, total: cards.length, name: '' })
  return { updated }
})

// ─── IPC: Slabs ───────────────────────────────────────────────────────────────

ipcMain.handle('slabs:list', () => {
  const { getSlabs } = require('./db')
  return getSlabs()
})

ipcMain.handle('slabs:create', (_, data) => {
  const { createSlab } = require('./db')
  return createSlab(data)
})

ipcMain.handle('slabs:update', (_, id, data) => {
  const { updateSlab } = require('./db')
  return updateSlab(id, data)
})

ipcMain.handle('slabs:delete', (_, id) => {
  const { deleteSlab } = require('./db')
  const imageUrl = deleteSlab(id)
  if (imageUrl?.startsWith('uploads/')) {
    const abs = path.join(app.getPath('userData'), imageUrl)
    if (fs.existsSync(abs)) fs.unlinkSync(abs)
  }
  return true
})

ipcMain.handle('slabs:upload-image', (_, slabId, filename, arrayBuffer) => {
  const dir = path.join(app.getPath('userData'), 'uploads', 'slabs')
  fs.mkdirSync(dir, { recursive: true })
  const ext = path.extname(filename) || '.jpg'
  const destPath = path.join(dir, `${slabId}${ext}`)
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer))
  const { updateSlab } = require('./db')
  return updateSlab(slabId, { imageUrl: `uploads/slabs/${slabId}${ext}` })
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

// ─── IPC: TCG card search ─────────────────────────────────────────────────────

ipcMain.handle('tcg:search', async (_, query, page = 1) => {
  const { searchCards } = require('./tcg')
  return searchCards(query, page)
})

ipcMain.handle('tcg:get-eur-usd-rate', async () => {
  const { fetchEurUsdRate } = require('./tcg')
  return fetchEurUsdRate()
})

// ─── Auto-updater ─────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  if (isDev) return  // never auto-update in dev

  const { autoUpdater } = require('electron-updater')

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update available',
      message: 'A new version of OffDex is downloading in the background.\nIt will install automatically when you close the app.',
      buttons: ['OK'],
    }).catch(() => {})
  })

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update ready',
      message: 'The update has been downloaded. Restart now to apply it?',
      buttons: ['Restart', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall()
    }).catch(() => {})
  })

  autoUpdater.on('error', err => {
    console.warn('Auto-updater error:', err?.message ?? err)
  })

  // Check 3 seconds after window is ready to avoid slowing startup
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000)
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  ensureDir('uploads')

  if (!isDev) {
    registerAppProtocol()
  }

  try {
    initDatabase()
    // Remove any TCG Pocket cards that slipped into the database
    try { const { deletePocketCards } = require('./db'); deletePocketCards() } catch { /* non-fatal */ }
    createWindow()
    setupAutoUpdater()
  } catch (err) {
    console.error('Failed to start OffDex:', err)
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
