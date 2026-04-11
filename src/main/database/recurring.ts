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

  db.run(
    `INSERT INTO recurring_templates
       (id, amount, type, description, category, frequency, next_date, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, data.amount, data.type, data.description, data.category, data.frequency, data.start_date, created_at]
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
  }
}

export function deleteRecurring(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM recurring_templates WHERE id = ?', [id])
  saveDatabase()
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

// ── Auto-process ──────────────────────────────────────────────────────────────

export function processDueRecurring(): number {
  const today     = new Date().toISOString().slice(0, 10)
  const templates = getAllRecurring().filter(t => t.active && t.next_date <= today)
  if (templates.length === 0) return 0

  const db = getDatabase()
  let count = 0

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
        })
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

  return count
}
