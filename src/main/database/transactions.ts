import { randomUUID } from 'crypto'
import { Transaction, CreateTransactionDTO } from '../../shared/types'
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
      created_at: String(row.created_at)
    })
  }
  stmt.free()

  return results
}

export function createTransaction(data: CreateTransactionDTO): Transaction {
  const db = getDatabase()
  const id = randomUUID()
  const created_at = new Date().toISOString()

  db.run(
    'INSERT INTO transactions (id, amount, type, description, date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.amount, data.type, data.description, data.date, created_at]
  )

  saveDatabase()

  return {
    id,
    amount: data.amount,
    type: data.type,
    description: data.description,
    date: data.date,
    created_at
  }
}

export function deleteTransaction(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM transactions WHERE id = ?', [id])
  saveDatabase()
}
