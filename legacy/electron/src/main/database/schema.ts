import initSqlJs, { Database } from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { migrateSavingsHexToSlots } from './savingsMigration'

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

  // Asegurar que existe la categoría reservada "Ahorro" en ambos tipos
  // (se asigna automáticamente a transacciones que van/vienen de apartados)
  for (const type of ['expense', 'income'] as const) {
    const check = db.prepare('SELECT COUNT(*) as cnt FROM categories WHERE name = ? AND type = ?')
    check.bind(['Ahorro', type])
    check.step()
    const exists = Number((check.getAsObject() as { cnt: number }).cnt) > 0
    check.free()
    if (!exists) {
      db.run('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [randomUUID(), 'Ahorro', type])
    }
  }

  // Asegurar que existe la categoría reservada "Deuda" para gastos
  // (se asigna automáticamente a las cuotas mensuales y pagos extra de deudas)
  {
    const check = db.prepare('SELECT COUNT(*) as cnt FROM categories WHERE name = ? AND type = ?')
    check.bind(['Deuda', 'expense'])
    check.step()
    const exists = Number((check.getAsObject() as { cnt: number }).cnt) > 0
    check.free()
    if (!exists) {
      db.run('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [randomUUID(), 'Deuda', 'expense'])
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

  // Migration: unique constraint on category name+type
  try {
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_type ON categories(name, type)')
  } catch {
    // Index already exists or duplicate data prevents creation — safe to ignore
  }

  // ── Ahorros (apartados / sub-cuentas) ────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS savings_accounts (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      color         TEXT,
      target_amount REAL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_savings_accounts_name ON savings_accounts(name)')

  // Migration: añadir savings_account_id a transactions (FK lógica, sin CASCADE
  // porque el borrado de apartados se bloquea cuando hay saldo)
  try {
    db.run('ALTER TABLE transactions ADD COLUMN savings_account_id TEXT')
  } catch {
    // Column already exists — safe to ignore
  }
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_savings ON transactions(savings_account_id)')

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

  // Migration: añadir debt_id a recurring_templates para que los templates que
  // materializan cuotas de una deuda enlacen las transacciones generadas.
  try {
    db.run('ALTER TABLE recurring_templates ADD COLUMN debt_id TEXT')
  } catch {
    // Column already exists — safe to ignore
  }
  // Migration: savings_account_id en recurring_templates (preparado para futuras
  // aportaciones recurrentes a apartados). Idempotente.
  try {
    db.run('ALTER TABLE recurring_templates ADD COLUMN savings_account_id TEXT')
  } catch {
    // Column already exists — safe to ignore
  }
  db.run('CREATE INDEX IF NOT EXISTS idx_recurring_debt ON recurring_templates(debt_id)')

  // ── Deudas (debts) ──────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS debts (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      creditor        TEXT,
      color           TEXT,
      initial_amount  REAL NOT NULL,
      monthly_amount  REAL NOT NULL,
      start_date      TEXT NOT NULL,
      recurring_id    TEXT,
      archived_at     TEXT,
      notes           TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_debts_active ON debts(archived_at)')

  // Migration: añadir debt_id a transactions (FK lógica, sin CASCADE)
  try {
    db.run('ALTER TABLE transactions ADD COLUMN debt_id TEXT')
  } catch {
    // Column already exists — safe to ignore
  }
  db.run('CREATE INDEX IF NOT EXISTS idx_transactions_debt ON transactions(debt_id)')

  saveDatabase()

  // Migración idempotente: hex literales de apartados → slots semánticos.
  try {
    migrateSavingsHexToSlots()
  } catch (err) {
    console.warn('[savings] migration to slots failed:', err)
  }

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
  try { db.run('ALTER TABLE transactions ADD COLUMN savings_account_id TEXT') } catch { /* exists */ }
  try { db.run('ALTER TABLE transactions ADD COLUMN debt_id TEXT') } catch { /* exists */ }
  try { db.run('ALTER TABLE recurring_templates ADD COLUMN debt_id TEXT') } catch { /* exists */ }
  try { db.run('ALTER TABLE recurring_templates ADD COLUMN savings_account_id TEXT') } catch { /* exists */ }
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS savings_accounts (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        color         TEXT,
        target_amount REAL,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  } catch { /* exists */ }
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS debts (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        creditor        TEXT,
        color           TEXT,
        initial_amount  REAL NOT NULL,
        monthly_amount  REAL NOT NULL,
        start_date      TEXT NOT NULL,
        recurring_id    TEXT,
        archived_at     TEXT,
        notes           TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  } catch { /* exists */ }
  saveDatabase()

  // Migrar colores hex importados a slots para que se armonicen con el tema.
  try {
    migrateSavingsHexToSlots()
  } catch (err) {
    console.warn('[savings] migration to slots failed on replaceDatabase:', err)
  }
}

export function getDbPath(): string {
  return dbPath
}
