import 'server-only'

import { readFileSync } from 'node:fs'
import path from 'node:path'

import initSqlJs, { type Database } from 'sql.js'

export interface LegacyExport {
  transactions: Array<{
    amount: number
    type: 'income' | 'expense'
    description: string
    note: string
    date: string
    category: string
    savingsAccountKey: string | null
    debtKey: string | null
  }>
  categories: Array<{ name: string; type: 'income' | 'expense' }>
  savings: Array<{
    key: string
    name: string
    color: string | null
    targetAmount: string | null
  }>
  debts: Array<{
    key: string
    name: string
    creditor: string | null
    color: string | null
    initialAmount: string
    monthlyAmount: string
    startDate: string
    archivedAt: string | null
    notes: string | null
  }>
  recurring: Array<{
    amount: string
    type: 'income' | 'expense'
    description: string
    category: string
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual'
    nextDate: string
    active: boolean
  }>
}

let cachedWasmPath: string | null = null

/**
 * Resuelve el path al sql-wasm.wasm en runtime. En serverless Vercel los
 * assets viven dentro del bundle, pero pueden estar en distintas rutas según
 * el bundling. Probamos varias y cacheamos la primera que existe.
 */
function resolveWasmPath(): string {
  if (cachedWasmPath) return cachedWasmPath

  // Construimos el path con string concatenation para evitar que webpack
  // detecte el import del .wasm e intente bundlarlo como módulo.
  // En Vercel los assets viven en process.cwd() (= /var/task) tras el tracing.
  const sqlJsDir = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist')
  const wasmName = 'sql-wasm.wasm'
  const candidates: string[] = [
    path.join(sqlJsDir, wasmName),
    // Algunas configs bundlan node_modules dentro de la función
    path.join(process.cwd(), '.next', 'server', 'node_modules', 'sql.js', 'dist', wasmName),
  ]

  for (const p of candidates) {
    try {
      readFileSync(p)
      cachedWasmPath = p
      return p
    } catch {
      // sigue probando
    }
  }
  throw new Error(
    `No se pudo encontrar sql-wasm.wasm. Intentado: ${candidates.join(' | ')}. CWD=${process.cwd()}`
  )
}

async function openDatabase(buffer: Buffer): Promise<Database> {
  const wasmPath = resolveWasmPath()
  // En Node, sql.js carga el WASM con su propio fs.readFile cuando se le
  // pasa locateFile. Es más fiable que pasar wasmBinary porque evita issues
  // con el shape del ArrayBuffer derivado de un Buffer.
  const SQL = await initSqlJs({ locateFile: () => wasmPath })
  return new SQL.Database(new Uint8Array(buffer))
}

function tableExists(db: Database, name: string): boolean {
  const stmt = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
  )
  stmt.bind([name])
  const exists = stmt.step()
  stmt.free()
  return exists
}

function getColumns(db: Database, table: string): Set<string> {
  const cols = new Set<string>()
  const stmt = db.prepare(`PRAGMA table_info(${table})`)
  while (stmt.step()) {
    const row = stmt.getAsObject() as { name: string }
    cols.add(row.name)
  }
  stmt.free()
  return cols
}

function rowsOf<T>(db: Database, sql: string): T[] {
  const stmt = db.prepare(sql)
  const out: T[] = []
  while (stmt.step()) out.push(stmt.getAsObject() as T)
  stmt.free()
  return out
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function asNumericString(v: unknown): string {
  if (v === null || v === undefined) return '0'
  if (typeof v === 'number') return v.toFixed(2)
  const s = String(v).trim()
  if (!s) return '0'
  return s.includes('.') ? s : `${s}.00`
}

/** Detecta si un Buffer es un archivo SQLite válido por magic bytes. */
export function isSqliteFile(buffer: Buffer | Uint8Array): boolean {
  if (buffer.length < 16) return false
  const header = 'SQLite format 3\0'
  for (let i = 0; i < 16; i++) {
    if (buffer[i] !== header.charCodeAt(i)) return false
  }
  return true
}

/**
 * Parsea un .db de Vantage legacy y devuelve los datos extraídos.
 * No persiste nada: los datos se devuelven planos para que el caller los
 * inserte vía los services.
 */
export async function parseLegacyDatabase(buffer: Buffer): Promise<LegacyExport> {
  const db = await openDatabase(buffer)
  try {
    const out: LegacyExport = {
      transactions: [],
      categories: [],
      savings: [],
      debts: [],
      recurring: [],
    }

    // ── Categorías ────────────────────────────────────────────────────────
    if (tableExists(db, 'categories')) {
      const rows = rowsOf<{ name: unknown; type: unknown }>(
        db,
        'SELECT name, type FROM categories'
      )
      for (const r of rows) {
        const name = asString(r.name).trim()
        const type = asString(r.type)
        if (!name) continue
        if (type !== 'income' && type !== 'expense') continue
        out.categories.push({ name, type })
      }
    }

    // ── Apartados ──────────────────────────────────────────────────────────
    if (tableExists(db, 'savings_accounts')) {
      const rows = rowsOf<{
        id: unknown
        name: unknown
        color: unknown
        target_amount: unknown
      }>(db, 'SELECT id, name, color, target_amount FROM savings_accounts')
      for (const r of rows) {
        const key = asString(r.id)
        const name = asString(r.name).trim()
        if (!name) continue
        out.savings.push({
          key,
          name,
          color: r.color === null || r.color === undefined ? null : asString(r.color),
          targetAmount:
            r.target_amount === null || r.target_amount === undefined
              ? null
              : asNumericString(r.target_amount),
        })
      }
    }

    // ── Deudas ─────────────────────────────────────────────────────────────
    if (tableExists(db, 'debts')) {
      const rows = rowsOf<{
        id: unknown
        name: unknown
        creditor: unknown
        color: unknown
        initial_amount: unknown
        monthly_amount: unknown
        start_date: unknown
        archived_at: unknown
        notes: unknown
      }>(
        db,
        'SELECT id, name, creditor, color, initial_amount, monthly_amount, start_date, archived_at, notes FROM debts'
      )
      for (const r of rows) {
        const key = asString(r.id)
        const name = asString(r.name).trim()
        if (!name) continue
        out.debts.push({
          key,
          name,
          creditor:
            r.creditor === null || r.creditor === undefined ? null : asString(r.creditor),
          color: r.color === null || r.color === undefined ? null : asString(r.color),
          initialAmount: asNumericString(r.initial_amount),
          monthlyAmount: asNumericString(r.monthly_amount),
          startDate: asString(r.start_date),
          archivedAt:
            r.archived_at === null || r.archived_at === undefined
              ? null
              : asString(r.archived_at),
          notes: r.notes === null || r.notes === undefined ? null : asString(r.notes),
        })
      }
    }

    // ── Recurrentes ────────────────────────────────────────────────────────
    if (tableExists(db, 'recurring_templates')) {
      const rows = rowsOf<{
        amount: unknown
        type: unknown
        description: unknown
        category: unknown
        frequency: unknown
        next_date: unknown
        active: unknown
      }>(
        db,
        'SELECT amount, type, description, category, frequency, next_date, active FROM recurring_templates'
      )
      for (const r of rows) {
        const type = asString(r.type)
        const freq = asString(r.frequency)
        if (type !== 'income' && type !== 'expense') continue
        if (!['weekly', 'monthly', 'quarterly', 'annual'].includes(freq)) continue
        out.recurring.push({
          amount: asNumericString(r.amount),
          type,
          description: asString(r.description),
          category: asString(r.category) || 'Otros',
          frequency: freq as 'weekly' | 'monthly' | 'quarterly' | 'annual',
          nextDate: asString(r.next_date),
          active: Number(r.active) !== 0,
        })
      }
    }

    // ── Transacciones ──────────────────────────────────────────────────────
    if (tableExists(db, 'transactions')) {
      const cols = getColumns(db, 'transactions')
      const hasNote = cols.has('note')
      const hasCategory = cols.has('category')
      const hasSavings = cols.has('savings_account_id')
      const hasDebt = cols.has('debt_id')

      const select = [
        'amount',
        'type',
        'description',
        'date',
        hasCategory ? 'category' : "'Otros' AS category",
        hasNote ? 'note' : "'' AS note",
        hasSavings ? 'savings_account_id' : 'NULL AS savings_account_id',
        hasDebt ? 'debt_id' : 'NULL AS debt_id',
      ].join(', ')

      const rows = rowsOf<{
        amount: unknown
        type: unknown
        description: unknown
        date: unknown
        category: unknown
        note: unknown
        savings_account_id: unknown
        debt_id: unknown
      }>(db, `SELECT ${select} FROM transactions ORDER BY date ASC`)

      for (const r of rows) {
        const type = asString(r.type)
        if (type !== 'income' && type !== 'expense') continue
        const amt = Number(r.amount)
        if (!isFinite(amt) || amt === 0) continue
        out.transactions.push({
          amount: Math.abs(amt),
          type,
          description: asString(r.description),
          note: asString(r.note),
          date: asString(r.date),
          category: asString(r.category) || 'Otros',
          savingsAccountKey:
            r.savings_account_id === null || r.savings_account_id === undefined
              ? null
              : asString(r.savings_account_id),
          debtKey:
            r.debt_id === null || r.debt_id === undefined ? null : asString(r.debt_id),
        })
      }
    }

    return out
  } finally {
    db.close()
  }
}
