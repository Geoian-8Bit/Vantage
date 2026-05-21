import { randomUUID } from 'crypto'
import type {
  Debt,
  CreateDebtDTO,
  UpdateDebtDTO,
  ExtraPaymentDTO,
} from '../../shared/types'
import { DEBT_CATEGORY_NAME } from '../../shared/types'
import { getDatabase, saveDatabase } from './schema'
import {
  createRecurringNoSave,
  deleteRecurringNoSave,
  deactivateRecurringNoSave,
  updateRecurringAmountNoSave,
} from './recurring'
import { createTransaction } from './transactions'

type DebtFilter = 'active' | 'archived' | 'all'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function rowToDebt(row: Record<string, unknown>, paid: number): Debt {
  const initial = Number(row.initial_amount)
  const monthly = Number(row.monthly_amount)
  const pending = Math.max(0, initial - paid)
  const months_remaining = monthly > 0 ? Math.ceil(pending / monthly) : 0
  return {
    id:             String(row.id),
    name:           String(row.name),
    creditor:       row.creditor != null ? String(row.creditor) : null,
    color:          row.color != null ? String(row.color) : null,
    initial_amount: initial,
    monthly_amount: monthly,
    start_date:     String(row.start_date),
    recurring_id:   row.recurring_id != null ? String(row.recurring_id) : null,
    archived_at:    row.archived_at != null ? String(row.archived_at) : null,
    notes:          row.notes != null ? String(row.notes) : null,
    created_at:     String(row.created_at),
    paid,
    pending,
    months_remaining,
  }
}

/** SUM(amount) de todas las transacciones que apuntan a una deuda. */
function computePaid(id: string): number {
  const db = getDatabase()
  const stmt = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) AS paid FROM transactions WHERE debt_id = ?'
  )
  stmt.bind([id])
  stmt.step()
  const paid = Number((stmt.getAsObject() as { paid: number }).paid)
  stmt.free()
  return paid
}

export function getAllDebts(filter: DebtFilter = 'all'): Debt[] {
  const db = getDatabase()
  let where = ''
  if (filter === 'active')   where = 'WHERE archived_at IS NULL'
  if (filter === 'archived') where = 'WHERE archived_at IS NOT NULL'
  const stmt = db.prepare(`SELECT * FROM debts ${where} ORDER BY archived_at IS NOT NULL, created_at ASC`)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>)
  stmt.free()

  // Calcular pagado en una sola query (evita N+1)
  const paidMap = new Map<string, number>()
  if (rows.length > 0) {
    const paidStmt = db.prepare(
      'SELECT debt_id AS id, COALESCE(SUM(amount), 0) AS paid ' +
        'FROM transactions WHERE debt_id IS NOT NULL GROUP BY debt_id'
    )
    while (paidStmt.step()) {
      const r = paidStmt.getAsObject() as { id: string; paid: number }
      paidMap.set(String(r.id), Number(r.paid))
    }
    paidStmt.free()
  }

  return rows.map(r => rowToDebt(r, paidMap.get(String(r.id)) ?? 0))
}

export function getDebtById(id: string): Debt | null {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM debts WHERE id = ?')
  stmt.bind([id])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const row = stmt.getAsObject() as Record<string, unknown>
  stmt.free()
  return rowToDebt(row, computePaid(id))
}

function validateDebtDTO(data: CreateDebtDTO | UpdateDebtDTO): { name: string; creditor: string | null; color: string | null; initial: number; monthly: number; start_date: string; notes: string | null } {
  const name = data.name.trim()
  if (!name) throw new Error('El nombre de la deuda no puede estar vacío')
  const initial = Number(data.initial_amount)
  if (!isFinite(initial) || initial <= 0) throw new Error('El importe inicial debe ser mayor que 0')
  const monthly = Number(data.monthly_amount)
  if (!isFinite(monthly) || monthly <= 0) throw new Error('La cuota mensual debe ser mayor que 0')
  if (monthly > initial) throw new Error('La cuota mensual no puede superar el capital inicial')
  if (!data.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.start_date)) {
    throw new Error('Fecha de inicio inválida')
  }
  return {
    name,
    creditor: data.creditor?.trim() || null,
    color: data.color?.trim() || null,
    initial,
    monthly,
    start_date: data.start_date,
    notes: data.notes?.trim() || null,
  }
}

export function createDebt(data: CreateDebtDTO): Debt {
  const v = validateDebtDTO(data)
  const db = getDatabase()
  const id = randomUUID()
  const created_at = new Date().toISOString()

  // Comprobar nombre único entre deudas activas (permitido reusar el nombre de
  // una saldada — el archivo histórico mantiene su rastro).
  const check = db.prepare('SELECT COUNT(*) AS cnt FROM debts WHERE name = ? AND archived_at IS NULL')
  check.bind([v.name])
  check.step()
  const dup = Number((check.getAsObject() as { cnt: number }).cnt) > 0
  check.free()
  if (dup) throw new Error(`Ya existe una deuda activa llamada "${v.name}"`)

  db.run('BEGIN TRANSACTION')
  try {
    db.run(
      `INSERT INTO debts (id, name, creditor, color, initial_amount, monthly_amount, start_date, recurring_id, archived_at, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [id, v.name, v.creditor, v.color, v.initial, v.monthly, v.start_date, v.notes, created_at]
    )

    // Crear el recurring template asociado: cuota mensual hasta saldar la deuda.
    const tpl = createRecurringNoSave({
      amount:      v.monthly,
      type:        'expense',
      description: `Cuota — ${v.name}`,
      category:    DEBT_CATEGORY_NAME,
      frequency:   'monthly',
      start_date:  v.start_date,
      debt_id:     id,
    })

    db.run('UPDATE debts SET recurring_id = ? WHERE id = ?', [tpl.id, id])

    db.run('COMMIT')
    saveDatabase()
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }

  const created = getDebtById(id)
  if (!created) throw new Error('Error al recargar la deuda recién creada')
  return created
}

export function updateDebt(id: string, data: UpdateDebtDTO): Debt {
  const v = validateDebtDTO(data)
  const db = getDatabase()
  const existing = getDebtById(id)
  if (!existing) throw new Error('Deuda no encontrada')
  if (existing.archived_at) throw new Error('No se puede editar una deuda saldada')

  // Si cambia el nombre, comprobar que no choca con otra activa
  if (v.name !== existing.name) {
    const check = db.prepare('SELECT COUNT(*) AS cnt FROM debts WHERE name = ? AND archived_at IS NULL AND id != ?')
    check.bind([v.name, id])
    check.step()
    const dup = Number((check.getAsObject() as { cnt: number }).cnt) > 0
    check.free()
    if (dup) throw new Error(`Ya existe una deuda activa llamada "${v.name}"`)
  }

  // No permitir reducir el capital inicial por debajo de lo ya pagado.
  if (v.initial < existing.paid) {
    throw new Error(`El capital no puede ser menor que lo ya pagado (${existing.paid.toFixed(2)} €)`)
  }

  db.run('BEGIN TRANSACTION')
  try {
    db.run(
      `UPDATE debts
         SET name = ?, creditor = ?, color = ?, initial_amount = ?, monthly_amount = ?, start_date = ?, notes = ?
       WHERE id = ?`,
      [v.name, v.creditor, v.color, v.initial, v.monthly, v.start_date, v.notes, id]
    )

    // Sincronizar el recurring template asociado:
    //  - Si cambia el importe → updateRecurringAmount
    //  - Si cambia el nombre → actualizar la descripción
    if (existing.recurring_id) {
      if (v.monthly !== existing.monthly_amount) {
        updateRecurringAmountNoSave(existing.recurring_id, v.monthly)
      }
      if (v.name !== existing.name) {
        db.run('UPDATE recurring_templates SET description = ? WHERE id = ?', [`Cuota — ${v.name}`, existing.recurring_id])
      }
    }

    db.run('COMMIT')
    saveDatabase()
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }

  const updated = getDebtById(id)
  if (!updated) throw new Error('Error al recargar la deuda actualizada')
  return updated
}

export function deleteDebt(id: string): void {
  const db = getDatabase()
  const debt = getDebtById(id)
  if (!debt) throw new Error('Deuda no encontrada')

  // Solo se permite borrar si está saldada o si nunca se ha pagado nada.
  // Caso típico: usuario crea una deuda y se equivoca → borrar permitido si paid == 0.
  if (!debt.archived_at && debt.paid > 0.005) {
    throw new Error(
      `No se puede eliminar la deuda "${debt.name}" porque tiene pagos registrados (${debt.paid.toFixed(2)} €). ` +
        'Espera a saldarla o anula los pagos antes de borrarla.'
    )
  }

  db.run('BEGIN TRANSACTION')
  try {
    // Borrar el recurring asociado y desvincular transacciones históricas.
    if (debt.recurring_id) {
      deleteRecurringNoSave(debt.recurring_id)
    }
    db.run('UPDATE transactions SET debt_id = NULL WHERE debt_id = ?', [id])
    db.run('DELETE FROM debts WHERE id = ?', [id])
    db.run('COMMIT')
    saveDatabase()
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }
}

/** Registra un pago extra puntual sobre una deuda. Crea una transacción
 *  vinculada (category='Deuda') y archiva la deuda si queda saldada. */
export function addExtraPayment(payload: ExtraPaymentDTO): { debt: Debt; transactionId: string } {
  const debt = getDebtById(payload.debt_id)
  if (!debt) throw new Error('Deuda no encontrada')
  if (debt.archived_at) throw new Error('La deuda ya está saldada')

  const amount = Number(payload.amount)
  if (!isFinite(amount) || amount <= 0) throw new Error('El importe del pago extra debe ser mayor que 0')
  // Permitir pago final que iguala el pendiente (con margen de 1 céntimo).
  if (amount > debt.pending + 0.005) {
    throw new Error(
      `El pago supera el capital pendiente (${debt.pending.toFixed(2)} €). ` +
        'Reduce el importe o registra solo lo necesario para saldar.'
    )
  }

  const date = payload.date && /^\d{4}-\d{2}-\d{2}$/.test(payload.date) ? payload.date : todayISO()
  const note = payload.note?.trim() || ''

  // createTransaction guarda en disco; archiveIfPaid también guardará si archiva.
  const tx = createTransaction({
    amount,
    type:        'expense',
    description: `Pago extra — ${debt.name}`,
    date,
    category:    DEBT_CATEGORY_NAME,
    note,
    debt_id:     debt.id,
  })

  archiveIfPaid(debt.id)

  const refreshed = getDebtById(debt.id)
  if (!refreshed) throw new Error('Error al recargar la deuda tras el pago')
  return { debt: refreshed, transactionId: tx.id }
}

/** Si la deuda está totalmente pagada, márcala como saldada y desactiva su
 *  recurring template. Idempotente: si ya está archivada o no llega al total
 *  no hace nada. Persiste a disco al terminar. */
export function archiveIfPaid(id: string): boolean {
  const db = getDatabase()
  const debt = getDebtById(id)
  if (!debt) return false
  if (debt.archived_at) return false
  if (debt.paid + 0.005 < debt.initial_amount) return false

  const today = todayISO()
  db.run('UPDATE debts SET archived_at = ? WHERE id = ?', [today, id])
  if (debt.recurring_id) {
    deactivateRecurringNoSave(debt.recurring_id)
  }
  saveDatabase()
  return true
}

/** Suma del capital pendiente de todas las deudas activas. */
export function getTotalDebtPending(): number {
  const db = getDatabase()
  // (initial_amount - paid) por deuda activa, suma total.
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(d.initial_amount - COALESCE(p.paid, 0)), 0) AS total
    FROM debts d
    LEFT JOIN (
      SELECT debt_id, SUM(amount) AS paid
      FROM transactions
      WHERE debt_id IS NOT NULL
      GROUP BY debt_id
    ) p ON p.debt_id = d.id
    WHERE d.archived_at IS NULL
  `)
  stmt.step()
  const total = Number((stmt.getAsObject() as { total: number }).total)
  stmt.free()
  return Math.max(0, total)
}
