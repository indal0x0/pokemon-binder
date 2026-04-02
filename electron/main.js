const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const Store = require('electron-store')

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
const PORT = 3000

let mainWindow = null

function getUserDataPath(...segments) {
  return path.join(app.getPath('userData'), ...segments)
}

function ensureUserDataDirs() {
  fs.mkdirSync(getUserDataPath('uploads'), { recursive: true })
}

function applyEnv() {
  const settings = store.get('settings', {})
  process.env.GEMINI_API_KEY = settings.geminiApiKey || process.env.GEMINI_API_KEY || ''
  process.env.POKEMON_TCG_API_KEY = settings.pokemonTcgApiKey || process.env.POKEMON_TCG_API_KEY || ''
  process.env.ELECTRON_USER_DATA = app.getPath('userData')
  process.env.DATABASE_URL = `file:${getUserDataPath('pokemon-binder.db')}`
  process.env.PORT = String(PORT)
}

function waitForServer(maxWaitMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function check() {
      http.get(`http://localhost:${PORT}`, res => {
        res.destroy()
        resolve()
      }).on('error', () => {
        if (Date.now() - start > maxWaitMs) {
          reject(new Error(`Server did not start within ${maxWaitMs}ms`))
        } else {
          setTimeout(check, 300)
        }
      })
    }
    check()
  })
}

async function startNextServer() {
  applyEnv()

  if (isDev) {
    // Dev: Next.js dev server is started separately via `npm run dev`
    // Just wait for it to be ready
    await waitForServer(60000)
    return
  }

  // Production: require() the standalone server directly in this process.
  // This works because Electron IS Node.js, so native modules (better-sqlite3)
  // load correctly without any ABI mismatch.
  const appRoot = app.getAppPath()
  const serverScript = path.join(appRoot, '.next', 'standalone', 'server.js')

  if (!fs.existsSync(serverScript)) {
    throw new Error(
      `Standalone server not found at:\n${serverScript}\n\nRun "npm run build" first.`
    )
  }

  // Copy static assets into standalone if missing (required by Next.js standalone)
  const staticSrc = path.join(appRoot, '.next', 'static')
  const staticDest = path.join(appRoot, '.next', 'standalone', '.next', 'static')
  if (fs.existsSync(staticSrc) && !fs.existsSync(staticDest)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true })
  }

  // Copy public assets into standalone if missing
  const publicSrc = path.join(appRoot, 'public')
  const publicDest = path.join(appRoot, '.next', 'standalone', 'public')
  if (fs.existsSync(publicSrc) && !fs.existsSync(publicDest)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true })
  }

  // Set the working directory the standalone server expects
  process.chdir(path.join(appRoot, '.next', 'standalone'))

  // Load and start the server in-process
  require(serverScript)

  await waitForServer(30000)
}

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

  mainWindow.loadURL(`http://localhost:${PORT}`)
  mainWindow.setMenuBarVisibility(false)

  // Open external links in the system browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── IPC handlers ───────────────────────────────────────────────────────────

ipcMain.handle('settings:get', () => store.get('settings', {}))

ipcMain.handle('settings:set', (_, newSettings) => {
  store.set('settings', newSettings)
  applyEnv() // apply immediately so next scan uses the new key
  return true
})

ipcMain.handle('app:userData', () => app.getPath('userData'))

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  ensureUserDataDirs()
  try {
    await startNextServer()
    createWindow()
  } catch (err) {
    console.error('Failed to start Pokemon Binder:', err)
    // Show error in a dialog before quitting
    const { dialog } = require('electron')
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
