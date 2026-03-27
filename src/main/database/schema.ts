import initSqlJs, { Database } from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

let db: Database | null = null
let dbPath: string = ''
let wasmPath: string = ''

export function setWasmPath(path: string): void {
  wasmPath = path
}

export async function initializeDatabase(filePath: string): Promise<Database> {
  dbPath = filePath

  const SQL = await initSqlJs({
    locateFile: () => wasmPath
  })

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // Enable WAL-like behavior (sql.js doesn't support WAL but we set journal mode)
  db.run('PRAGMA journal_mode = DELETE')

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          TEXT PRIMARY KEY,
      amount      REAL NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      description TEXT NOT NULL DEFAULT '',
      date        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC)')
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)')

  saveDatabase()

  return db
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.')
  }
  return db
}

export function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}
