import initSqlJs, { Database } from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

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

  // sql.js doesn't support WAL mode; DELETE is the default and works correctly
  db.run('PRAGMA journal_mode = DELETE')
  db.run('PRAGMA foreign_keys = ON')

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

  // Categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense'))
    )
  `)

  // Seed default categories if the table is empty
  const countStmt = db.prepare('SELECT COUNT(*) as cnt FROM categories')
  countStmt.step()
  const countRow = countStmt.getAsObject() as { cnt: number }
  countStmt.free()
  if (Number(countRow.cnt) === 0) {
    const defaultExpense = ['Alimentación','Transporte','Alquiler','Ocio','Salud','Ropa','Servicios','Otros']
    const defaultIncome  = ['Nómina','Bizum','Regalo','Inversión']
    for (const name of defaultExpense) {
      db.run('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [randomUUID(), name, 'expense'])
    }
    for (const name of defaultIncome) {
      db.run('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [randomUUID(), name, 'income'])
    }
  }

  // Migration: add category column if it does not yet exist
  try {
    db.run("ALTER TABLE transactions ADD COLUMN category TEXT NOT NULL DEFAULT 'Otros'")
  } catch {
    // Column already exists — safe to ignore
  }

  // Migration: add note column if it does not yet exist
  try {
    db.run("ALTER TABLE transactions ADD COLUMN note TEXT NOT NULL DEFAULT ''")
  } catch {
    // Column already exists — safe to ignore
  }

  // Recurring templates table
  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_templates (
      id          TEXT    PRIMARY KEY,
      amount      REAL    NOT NULL,
      type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
      description TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      frequency   TEXT    NOT NULL CHECK(frequency IN ('weekly','monthly','quarterly','annual')),
      next_date   TEXT    NOT NULL,
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL
    )
  `)

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

export async function replaceDatabase(buffer: Buffer): Promise<void> {
  if (db) {
    db.close()
    db = null
  }

  const SQL = await initSqlJs({ locateFile: () => wasmPath })
  db = new SQL.Database(new Uint8Array(buffer))

  db.run('PRAGMA journal_mode = DELETE')
  db.run('PRAGMA foreign_keys = ON')

  // Re-run migrations for older backups
  try { db.run("ALTER TABLE transactions ADD COLUMN category TEXT NOT NULL DEFAULT 'Otros'") } catch { /* exists */ }
  try { db.run("ALTER TABLE transactions ADD COLUMN note TEXT NOT NULL DEFAULT ''") } catch { /* exists */ }
  saveDatabase()
}

export function getDbPath(): string {
  return dbPath
}
