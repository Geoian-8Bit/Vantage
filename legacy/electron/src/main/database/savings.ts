import { randomUUID } from 'crypto'
import type {
  SavingsAccount,
  CreateSavingsAccountDTO,
  UpdateSavingsAccountDTO,
} from '../../shared/types'
import { getDatabase, saveDatabase } from './schema'

/** Saldo de un apartado: SUM(expenses) - SUM(incomes) ligados a ese apartado.
 *  Las aportaciones (expense) suman; las retiradas (income) restan. */
function computeBalance(id: string): number {
  const db = getDatabase()
  const stmt = db.prepare(
    "SELECT COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE -amount END), 0) AS bal " +
      'FROM transactions WHERE savings_account_id = ?'
  )
  stmt.bind([id])
  stmt.step()
  const bal = Number((stmt.getAsObject() as { bal: number }).bal)
  stmt.free()
  return bal
}

function rowToAccount(row: Record<string, unknown>, balance: number): SavingsAccount {
  return {
    id: String(row.id),
    name: String(row.name),
    color: row.color != null ? String(row.color) : null,
    target_amount: row.target_amount != null ? Number(row.target_amount) : null,
    created_at: String(row.created_at),
    balance,
  }
}

export function getAllSavingsAccounts(): SavingsAccount[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM savings_accounts ORDER BY created_at ASC')
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()

  // Calcular saldos en una sola consulta para evitar N+1
  const balances = new Map<string, number>()
  if (rows.length > 0) {
    const balStmt = db.prepare(
      "SELECT savings_account_id AS id, " +
        "COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE -amount END), 0) AS bal " +
        'FROM transactions WHERE savings_account_id IS NOT NULL GROUP BY savings_account_id'
    )
    while (balStmt.step()) {
      const r = balStmt.getAsObject() as { id: string; bal: number }
      balances.set(String(r.id), Number(r.bal))
    }
    balStmt.free()
  }

  return rows.map(r => rowToAccount(r, balances.get(String(r.id)) ?? 0))
}

export function getSavingsAccountById(id: string): SavingsAccount | null {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM savings_accounts WHERE id = ?')
  stmt.bind([id])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const row = stmt.getAsObject() as Record<string, unknown>
  stmt.free()
  return rowToAccount(row, computeBalance(id))
}

export function createSavingsAccount(data: CreateSavingsAccountDTO): SavingsAccount {
  const db = getDatabase()
  const trimmed = data.name.trim()
  if (!trimmed) throw new Error('El nombre del apartado no puede estar vacío')

  const check = db.prepare('SELECT COUNT(*) as cnt FROM savings_accounts WHERE name = ?')
  check.bind([trimmed])
  check.step()
  const exists = Number((check.getAsObject() as { cnt: number }).cnt) > 0
  check.free()
  if (exists) throw new Error(`Ya existe un apartado llamado "${trimmed}"`)

  const target = data.target_amount != null && data.target_amount > 0 ? data.target_amount : null
  const color = data.color?.trim() || null

  const id = randomUUID()
  const created_at = new Date().toISOString()
  db.run(
    'INSERT INTO savings_accounts (id, name, color, target_amount, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, trimmed, color, target, created_at]
  )
  saveDatabase()

  return { id, name: trimmed, color, target_amount: target, created_at, balance: 0 }
}

export function updateSavingsAccount(id: string, data: UpdateSavingsAccountDTO): SavingsAccount {
  const db = getDatabase()
  const existing = getSavingsAccountById(id)
  if (!existing) throw new Error('Apartado no encontrado')

  const trimmed = data.name.trim()
  if (!trimmed) throw new Error('El nombre del apartado no puede estar vacío')

  if (trimmed !== existing.name) {
    const check = db.prepare('SELECT COUNT(*) as cnt FROM savings_accounts WHERE name = ? AND id != ?')
    check.bind([trimmed, id])
    check.step()
    const dup = Number((check.getAsObject() as { cnt: number }).cnt) > 0
    check.free()
    if (dup) throw new Error(`Ya existe un apartado llamado "${trimmed}"`)
  }

  const target = data.target_amount != null && data.target_amount > 0 ? data.target_amount : null
  const color = data.color?.trim() || null

  db.run(
    'UPDATE savings_accounts SET name = ?, color = ?, target_amount = ? WHERE id = ?',
    [trimmed, color, target, id]
  )
  saveDatabase()

  return { ...existing, name: trimmed, color, target_amount: target }
}

/** Borra un apartado SOLO si su saldo es 0. En caso contrario lanza error. */
export function deleteSavingsAccount(id: string): void {
  const db = getDatabase()
  const account = getSavingsAccountById(id)
  if (!account) throw new Error('Apartado no encontrado')

  if (Math.abs(account.balance) > 0.005) {
    throw new Error(
      `No se puede eliminar el apartado "${account.name}" porque aún tiene saldo. ` +
        'Retira el dinero antes de borrarlo.'
    )
  }

  // El apartado tiene saldo 0: dejamos las transacciones históricas con el id
  // huérfano. El borrado solo elimina la cuenta, no las transacciones (que
  // siguen contando en el profit como ya hacen). Limpiamos la referencia para
  // que no aparezcan etiquetadas con un apartado inexistente.
  db.run('UPDATE transactions SET savings_account_id = NULL WHERE savings_account_id = ?', [id])
  db.run('DELETE FROM savings_accounts WHERE id = ?', [id])
  saveDatabase()
}

/** Suma de todos los saldos de apartados — útil para dashboard */
export function getTotalSavings(): number {
  const db = getDatabase()
  const stmt = db.prepare(
    "SELECT COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE -amount END), 0) AS total " +
      'FROM transactions WHERE savings_account_id IS NOT NULL'
  )
  stmt.step()
  const total = Number((stmt.getAsObject() as { total: number }).total)
  stmt.free()
  return total
}
