import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { IPC_CHANNELS } from '../shared/types'
import { initializeDatabase, closeDatabase, setWasmPath } from './database/schema'
import { getAllTransactions, createTransaction, deleteTransaction, updateTransaction } from './database/transactions'
import { getAllCategories, createCategory, deleteCategory, updateCategory } from './database/categories'
import {
  handleDialogOpenFile,
  handleExportTransactionsExcel,
  handleParseExcel,
  handleAccessTables,
  handleParseAccess,
  handleImportCommit,
} from './importExport'
import {
  getAllRecurring,
  createRecurring,
  deleteRecurring,
  toggleRecurring,
  processDueRecurring,
} from './database/recurring'
import { getDashboardStats } from './database/dashboard'
import { handleBackup, handleRestore } from './database/backup'
import { handleExportPDF } from './importExport'

let mainWindow: BrowserWindow | null = null

let dbReadyResolve!: () => void
const dbReady = new Promise<void>(resolve => { dbReadyResolve = resolve })

let pendingRecurringCount = 0

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
  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_GET_ALL, async () => {
    await dbReady
    return getAllTransactions()
  })

  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_CREATE, async (_event, data) => {
    await dbReady
    return createTransaction(data)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_DELETE, async (_event, { id }) => {
    await dbReady
    deleteTransaction(id)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_UPDATE, async (_event, { id, data }) => {
    await dbReady
    return updateTransaction(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_GET_ALL, async () => {
    await dbReady
    return getAllCategories()
  })

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_CREATE, async (_event, data) => {
    await dbReady
    return createCategory(data)
  })

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_DELETE, async (_event, { id }) => {
    await dbReady
    deleteCategory(id)
  })

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_UPDATE, async (_event, { id, name }) => {
    await dbReady
    return updateCategory(id, name)
  })

  // ── File I/O ───────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE,            handleDialogOpenFile)
  ipcMain.handle(IPC_CHANNELS.EXPORT_TRANSACTIONS_EXCEL,   handleExportTransactionsExcel)
  ipcMain.handle(IPC_CHANNELS.IMPORT_PARSE_EXCEL,          handleParseExcel)
  ipcMain.handle(IPC_CHANNELS.IMPORT_ACCESS_TABLES,        handleAccessTables)
  ipcMain.handle(IPC_CHANNELS.IMPORT_PARSE_ACCESS,         handleParseAccess)
  ipcMain.handle(IPC_CHANNELS.IMPORT_COMMIT, async (e, payload) => {
    await dbReady
    return handleImportCommit(e, payload)
  })

  // ── Recurring ─────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.RECURRING_GET_ALL, async () => {
    await dbReady
    return getAllRecurring()
  })

  ipcMain.handle(IPC_CHANNELS.RECURRING_CREATE, async (_event, data) => {
    await dbReady
    return createRecurring(data)
  })

  ipcMain.handle(IPC_CHANNELS.RECURRING_DELETE, async (_event, { id }) => {
    await dbReady
    deleteRecurring(id)
  })

  ipcMain.handle(IPC_CHANNELS.RECURRING_TOGGLE, async (_event, { id }) => {
    await dbReady
    return toggleRecurring(id)
  })

  ipcMain.handle(IPC_CHANNELS.RECURRING_PROCESS, async () => {
    await dbReady
    const count = pendingRecurringCount
    pendingRecurringCount = 0
    return { count }
  })

  // ── Dashboard ───────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_STATS, async () => {
    await dbReady
    return getDashboardStats()
  })

  // ── PDF Export ────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.EXPORT_PDF, async (_event, payload) => {
    return handleExportPDF(_event, payload)
  })

  // ── Backup / Restore ───────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.DB_BACKUP, async () => {
    await dbReady
    return handleBackup()
  })

  ipcMain.handle(IPC_CHANNELS.DB_RESTORE, async () => {
    await dbReady
    return handleRestore()
  })
}

app.whenReady().then(async () => {
  try {
    const dbPath = getDbPath()
    const dbDir = dirname(dbPath)
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }

    setWasmPath(getWasmPath())

    // Register handlers before DB is ready — they await dbReady internally
    registerIpcHandlers()

    // DB init and window creation run in parallel
    await Promise.all([
      initializeDatabase(dbPath).then(() => {
        pendingRecurringCount = processDueRecurring()
        dbReadyResolve()
      }),
      createWindow()
    ])
  } catch (err) {
    console.error('Failed to start app:', err)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  closeDatabase()
  app.quit()
})
