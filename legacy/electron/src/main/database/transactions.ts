import { randomUUID } from 'crypto'
import { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../../shared/types'
import { getDatabase, saveDatabase } from './schema'

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    amount: Number(row.amount),
    type: row.type as 'income' | 'expense',
    description: String(row.description),
    date: String(row.date),
    category: String(row.category),
    created_at: String(row.created_at),
    note: row.note ? String(row.note) : '',
    savings_account_id: row.savings_account_id != null ? String(row.savings_account_id) : null,
    debt_id: row.debt_id != null ? String(row.debt_id) : null,
  }
}

export function getAllTransactions(): Transaction[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC')
  const results: Transaction[] = []

  while (stmt.step()) {
    results.push(rowToTransaction(stmt.getAsObject() as Record<string, unknown>))
  }
  stmt.free()

  return results
}

export function createTransaction(data: CreateTransactionDTO): Transaction {
  const db = getDatabase()
  const id = randomUUID()
  const created_at = new Date().toISOString()
  const note = data.note ?? ''
  const savingsId = data.savings_account_id ?? null
  const debtId = data.debt_id ?? null

  db.run(
    'INSERT INTO transactions (id, amount, type, description, date, category, created_at, note, savings_account_id, debt_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.amount, data.type, data.description, data.date, data.category, created_at, note, savingsId, debtId]
  )

  saveDatabase()

  return {
    id,
    amount: data.amount,
    type: data.type,
    description: data.description,
    date: data.date,
    category: data.category,
    created_at,
    note,
    savings_account_id: savingsId,
    debt_id: debtId,
  }
}

export function deleteTransaction(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM transactions WHERE id = ?', [id])
  saveDatabase()
}

export function bulkDeleteTransactions(ids: string[]): number {
  if (ids.length === 0) return 0
  const db = getDatabase()
  const placeholders = ids.map(() => '?').join(',')
  db.run(`DELETE FROM transactions WHERE id IN (${placeholders})`, ids)
  saveDatabase()
  return ids.length
}

/** Create a transaction without saving to disk — caller is responsible for saveDatabase() */
export function createTransactionNoSave(data: CreateTransactionDTO): Transaction {
  const db = getDatabase()
  const id = randomUUID()
  const created_at = new Date().toISOString()
  const note = data.note ?? ''
  const savingsId = data.savings_account_id ?? null
  const debtId = data.debt_id ?? null

  db.run(
    'INSERT INTO transactions (id, amount, type, description, date, category, created_at, note, savings_account_id, debt_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.amount, data.type, data.description, data.date, data.category, created_at, note, savingsId, debtId]
  )

  return {
    id,
    amount: data.amount,
    type: data.type,
    description: data.description,
    date: data.date,
    category: data.category,
    created_at,
    note,
    savings_account_id: savingsId,
    debt_id: debtId,
  }
}

export function updateTransaction(id: string, data: UpdateTransactionDTO): Transaction {
  const db = getDatabase()
  const note = data.note ?? ''
  const savingsId = data.savings_account_id ?? null
  const debtId = data.debt_id ?? null

  db.run(
    'UPDATE transactions SET amount=?, type=?, description=?, date=?, category=?, note=?, savings_account_id=?, debt_id=? WHERE id=?',
    [data.amount, data.type, data.description, data.date, data.category, note, savingsId, debtId, id]
  )

  saveDatabase()

  const stmt = db.prepare('SELECT created_at FROM transactions WHERE id=?')
  stmt.bind([id])
  const found = stmt.step()
  const created_at = found
    ? String((stmt.getAsObject() as { created_at: string }).created_at)
    : new Date().toISOString()
  stmt.free()

  if (!found) throw new Error(`Transaction not found: ${id}`)

  return { id, ...data, note, savings_account_id: savingsId, debt_id: debtId, created_at }
}
