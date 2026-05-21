import { randomUUID } from 'crypto'
import type {
  RecurringTemplate,
  RecurringFrequency,
  CreateRecurringTemplateDTO,
} from '../../shared/types'
import { getDatabase, saveDatabase } from './schema'
import { createTransactionNoSave } from './transactions'

// ── Date helpers ──────────────────────────────────────────────────────────────

function advanceDate(date: string, freq: RecurringFrequency): string {
  const d = new Date(date + 'T12:00:00Z') // use noon UTC to avoid DST edge cases
  if (freq === 'weekly')    d.setUTCDate(d.getUTCDate() + 7)
  if (freq === 'monthly')   d.setUTCMonth(d.getUTCMonth() + 1)
  if (freq === 'quarterly') d.setUTCMonth(d.getUTCMonth() + 3)
  if (freq === 'annual')    d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function rowToTemplate(row: Record<string, unknown>): RecurringTemplate {
  return {
    id:          String(row.id),
    amount:      Number(row.amount),
    type:        row.type as 'income' | 'expense',
    description: String(row.description),
    category:    String(row.category),
    frequency:   row.frequency as RecurringFrequency,
    next_date:   String(row.next_date),
    active:      Number(row.active) === 1,
    created_at:  String(row.created_at),
    debt_id:           row.debt_id != null ? String(row.debt_id) : null,
    savings_account_id: row.savings_account_id != null ? String(row.savings_account_id) : null,
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function getAllRecurring(): RecurringTemplate[] {
  const db = getDatabase()
  const stmt = db.prepare(
    'SELECT * FROM recurring_templates ORDER BY created_at DESC'
  )
  const results: RecurringTemplate[] = []
  while (stmt.step()) {
    results.push(rowToTemplate(stmt.getAsObject() as Record<string, unknown>))
  }
  stmt.free()
  return results
}

export function createRecurring(data: CreateRecurringTemplateDTO): RecurringTemplate {
  const db = getDatabase()
  const id         = randomUUID()
  const created_at = new Date().toISOString()
  const debtId      = data.debt_id ?? null
  const savingsId   = data.savings_account_id ?? null

  db.run(
    `INSERT INTO recurring_templates
       (id, amount, type, description, category, frequency, next_date, active, created_at, debt_id, savings_account_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [id, data.amount, data.type, data.description, data.category, data.frequency, data.start_date, created_at, debtId, savingsId]
  )
  saveDatabase()

  return {
    id,
    amount:      data.amount,
    type:        data.type,
    description: data.description,
    category:    data.category,
    frequency:   data.frequency,
    next_date:   data.start_date,
    active:      true,
    created_at,
    debt_id:           debtId,
    savings_account_id: savingsId,
  }
}

/** Crea un recurring sin persistir a disco — el caller debe llamar saveDatabase().
 *  Útil cuando se crea como parte de una transacción SQL más grande (p.ej. createDebt). */
export function createRecurringNoSave(data: CreateRecurringTemplateDTO): RecurringTemplate {
  const db = getDatabase()
  const id         = randomUUID()
  const created_at = new Date().toISOString()
  const debtId      = data.debt_id ?? null
  const savingsId   = data.savings_account_id ?? null

  db.run(
    `INSERT INTO recurring_templates
       (id, amount, type, description, category, frequency, next_date, active, created_at, debt_id, savings_account_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [id, data.amount, data.type, data.description, data.category, data.frequency, data.start_date, created_at, debtId, savingsId]
  )

  return {
    id,
    amount:      data.amount,
    type:        data.type,
    description: data.description,
    category:    data.category,
    frequency:   data.frequency,
    next_date:   data.start_date,
    active:      true,
    created_at,
    debt_id:           debtId,
    savings_account_id: savingsId,
  }
}

export function deleteRecurring(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM recurring_templates WHERE id = ?', [id])
  saveDatabase()
}

export function deleteRecurringNoSave(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM recurring_templates WHERE id = ?', [id])
}

export function toggleRecurring(id: string): RecurringTemplate {
  const db = getDatabase()
  db.run('UPDATE recurring_templates SET active = 1 - active WHERE id = ?', [id])
  saveDatabase()

  const stmt = db.prepare('SELECT * FROM recurring_templates WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const row = rowToTemplate(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()
  return row
}

/** Desactiva un recurring sin tocar disco. Idempotente — si ya está inactivo no hace nada. */
export function deactivateRecurringNoSave(id: string): void {
  const db = getDatabase()
  db.run('UPDATE recurring_templates SET active = 0 WHERE id = ?', [id])
}

/** Cambia el importe de un recurring sin tocar disco. */
export function updateRecurringAmountNoSave(id: string, amount: number): void {
  const db = getDatabase()
  db.run('UPDATE recurring_templates SET amount = ? WHERE id = ?', [amount, id])
}

// ── Auto-process ──────────────────────────────────────────────────────────────

export interface ProcessRecurringResult {
  /** Número total de transacciones registradas */
  count: number
  /** IDs de deudas a las que se aplicó al menos una cuota — el caller debería
   *  invocar `archiveIfPaid` con cada una para cerrar las que se hayan saldado.
   *  Devolverlo aquí (en lugar de llamar archiveIfPaid directamente) evita la
   *  dependencia circular `recurring.ts ↔ debts.ts`. */
  debtIdsTouched: string[]
}

export function processDueRecurring(): ProcessRecurringResult {
  const today     = new Date().toISOString().slice(0, 10)
  const templates = getAllRecurring().filter(t => t.active && t.next_date <= today)
  if (templates.length === 0) return { count: 0, debtIdsTouched: [] }

  const db = getDatabase()
  let count = 0
  const debtIdsTouched = new Set<string>()

  // Wrap everything in a SQL transaction so a mid-process crash
  // doesn't create duplicate transactions on next run.
  db.run('BEGIN TRANSACTION')
  try {
    for (const tpl of templates) {
      let date = tpl.next_date

      // register every missed occurrence (handles app not opened for several days)
      while (date <= today) {
        createTransactionNoSave({
          amount:      tpl.amount,
          type:        tpl.type,
          description: tpl.description,
          category:    tpl.category,
          date,
          note:        '',
          debt_id:           tpl.debt_id ?? null,
          savings_account_id: tpl.savings_account_id ?? null,
        })
        if (tpl.debt_id) debtIdsTouched.add(tpl.debt_id)
        date = advanceDate(date, tpl.frequency)
        count++
      }

      // advance next_date to next future occurrence
      db.run('UPDATE recurring_templates SET next_date = ? WHERE id = ?', [date, tpl.id])
    }

    db.run('COMMIT')
    saveDatabase()
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }

  return { count, debtIdsTouched: Array.from(debtIdsTouched) }
}
