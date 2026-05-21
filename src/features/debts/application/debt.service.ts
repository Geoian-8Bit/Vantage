import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { transactions } from '@/db/schema'
import { NotFoundError, ValidationError } from '@/lib/api/errors'
import { transactionService } from '@/features/transactions/application/transaction.service'

import type { CreateDebtInput, Debt, UpdateDebtInput } from '../domain/debt.schema'
import { debtRepository } from '../infrastructure/debt.repository'

export interface ExtraPaymentInput {
  amount: string
  date: string
  note?: string
}

export interface ExtraPaymentResult {
  debt: Debt
  archived: boolean
  pendingAfter: number
}

export const debtService = {
  list(spaceId: string): Promise<Debt[]> {
    return debtRepository.findAll(spaceId)
  },

  create(spaceId: string, input: CreateDebtInput): Promise<Debt> {
    return debtRepository.create(spaceId, input)
  },

  async update(spaceId: string, id: string, input: UpdateDebtInput): Promise<Debt> {
    const d = await debtRepository.update(spaceId, id, input)
    if (!d) throw new NotFoundError('Deuda no encontrada')
    return d
  },

  async remove(spaceId: string, id: string): Promise<void> {
    const ok = await debtRepository.remove(spaceId, id)
    if (!ok) throw new NotFoundError('Deuda no encontrada')
  },

  /**
   * Calcula lo pendiente de una deuda como initial - sum(expenses con debtId).
   * Único cálculo central server-side para no divergir con el cliente.
   */
  async getPending(spaceId: string, debtId: string): Promise<number> {
    const all = await db
      .select({ amount: transactions.amount, type: transactions.type })
      .from(transactions)
      .where(
        and(
          eq(transactions.spaceId, spaceId),
          eq(transactions.debtId, debtId),
          eq(transactions.type, 'expense')
        )
      )
    const paid = all.reduce((s, r) => s + Number(r.amount), 0)
    const debts = await debtRepository.findAll(spaceId)
    const debt = debts.find((d) => d.id === debtId)
    if (!debt) throw new NotFoundError('Deuda no encontrada')
    return Math.max(0, Number(debt.initialAmount) - paid)
  },

  /**
   * Registra un pago extra a una deuda: crea una transacción tipo expense
   * vinculada a la deuda y, si con ese pago se cubre todo lo pendiente,
   * archiva la deuda automáticamente.
   *
   * Atómico best-effort: si la creación falla, la deuda no se archiva.
   */
  async extraPayment(
    spaceId: string,
    userId: string,
    debtId: string,
    input: ExtraPaymentInput
  ): Promise<ExtraPaymentResult> {
    const amt = Number(input.amount)
    if (!isFinite(amt) || amt <= 0) {
      throw new ValidationError('Importe inválido')
    }

    const debts = await debtRepository.findAll(spaceId)
    const debt = debts.find((d) => d.id === debtId)
    if (!debt) throw new NotFoundError('Deuda no encontrada')
    if (debt.archivedAt) {
      throw new ValidationError('La deuda ya está saldada')
    }

    const pendingBefore = await this.getPending(spaceId, debtId)
    if (amt > pendingBefore + 0.005) {
      throw new ValidationError(
        `El pago (${amt.toFixed(2)}) excede el pendiente (${pendingBefore.toFixed(2)})`
      )
    }

    await transactionService.create(spaceId, userId, {
      amount: amt.toFixed(2),
      type: 'expense',
      description: `Pago extra ${debt.name}`,
      note: input.note ?? '',
      date: input.date,
      category: 'Deuda',
      debtId,
    })

    const pendingAfter = Math.max(0, pendingBefore - amt)
    let updatedDebt = debt
    let archived = false
    if (pendingAfter <= 0.005) {
      const archivedDebt = await debtRepository.update(spaceId, debtId, {
        archivedAt: new Date().toISOString(),
      })
      if (archivedDebt) {
        updatedDebt = archivedDebt
        archived = true
      }
    }

    return { debt: updatedDebt, archived, pendingAfter }
  },
}
