import { randomUUID } from 'crypto'
import { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../../shared/types'
import { getDatabase, saveDatabase } from './schema'

export function getAllTransactions(): Transaction[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC')
  const results: Transaction[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Transaction
    results.push({
      id: String(row.id),
      amount: Number(row.amount),
      type: row.type as 'income' | 'expense',
      description: String(row.description),
      date: String(row.date),
      category: String(row.category),
      created_at: String(row.created_at),
      note: row.note ? String(row.note) : '',
    })
  }
  stmt.free()

  return results
}

export function createTransaction(data: CreateTransactionDTO): Transaction {
  const db = getDatabase()
  const id = randomUUID()
  const created_at = new Date().toISOString()
  const note = data.note ?? ''

  db.run(
    'INSERT INTO transactions (id, amount, type, description, date, category, created_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.amount, data.type, data.description, data.date, data.category, created_at, note]
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
  }
}

export function deleteTransaction(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM transactions WHERE id = ?', [id])
  saveDatabase()
}

export function updateTransaction(id: string, data: UpdateTransactionDTO): Transaction {
  const db = getDatabase()
  const note = data.note ?? ''

  db.run(
    'UPDATE transactions SET amount=?, type=?, description=?, date=?, category=?, note=? WHERE id=?',
    [data.amount, data.type, data.description, data.date, data.category, note, id]
  )

  saveDatabase()

  const stmt = db.prepare('SELECT created_at FROM transactions WHERE id=?')
  stmt.bind([id])
  stmt.step()
  const row = stmt.getAsObject() as unknown as { created_at: string }
  const created_at = String(row.created_at)
  stmt.free()

  return { id, ...data, note, created_at }
}
