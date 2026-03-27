import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { IPC_CHANNELS } from '../shared/types'
import { initializeDatabase, closeDatabase, setWasmPath } from './database/schema'
import { getAllTransactions, createTransaction, deleteTransaction } from './database/transactions'

let mainWindow: BrowserWindow | null = null

function getDbPath(): string {
  // For portable builds, store DB next to the executable
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  if (portableDir) {
    return join(portableDir, 'vantage-data', 'vantage.db')
  }
  // For development/installed builds, use user data directory
  return join(app.getPath('userData'), 'vantage.db')
}

function getWasmPath(): string {
  // In production, check extraResources first
  if (app.isPackaged) {
    const resourcePath = join(process.resourcesPath, 'sql-wasm.wasm')
    if (existsSync(resourcePath)) {
      return resourcePath
    }
  }
  // In development, use node_modules
  return join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // In dev, load from vite dev server. In production, load the built file.
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_GET_ALL, () => {
    return getAllTransactions()
  })

  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_CREATE, (_event, data) => {
    return createTransaction(data)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_DELETE, (_event, { id }) => {
    deleteTransaction(id)
  })
}

app.whenReady().then(async () => {
  try {
    // Ensure portable data directory exists
    const dbPath = getDbPath()
    const dbDir = join(dbPath, '..')
    const { mkdirSync } = await import('fs')
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }

    const wasmFile = getWasmPath()
    console.log('DB path:', dbPath)
    console.log('WASM path:', wasmFile)
    console.log('WASM exists:', existsSync(wasmFile))

    setWasmPath(wasmFile)
    await initializeDatabase(dbPath)
    console.log('Database initialized')

    registerIpcHandlers()
    await createWindow()
    console.log('Window created')
  } catch (err) {
    console.error('Failed to start app:', err)
  }
})

app.on('window-all-closed', () => {
  closeDatabase()
  app.quit()
})
