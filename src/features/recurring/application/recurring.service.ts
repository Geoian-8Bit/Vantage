import 'server-only'

import { NotFoundError } from '@/lib/api/errors'
import { transactionService } from '@/features/transactions/application/transaction.service'

import type {
  CreateRecurringInput,
  RecurringFrequency,
  RecurringTemplate,
  UpdateRecurringInput,
} from '../domain/recurring.schema'
import { recurringRepository } from '../infrastructure/recurring.repository'

function advanceDate(date: string, freq: RecurringFrequency): string {
  // Noon UTC para evitar problemas de DST en las aritméticas de fechas.
  const d = new Date(date + 'T12:00:00Z')
  if (freq === 'weekly') d.setUTCDate(d.getUTCDate() + 7)
  if (freq === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1)
  if (freq === 'quarterly') d.setUTCMonth(d.getUTCMonth() + 3)
  if (freq === 'annual') d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export interface ProcessRecurringResult {
  count: number
}

export const recurringService = {
  list(spaceId: string): Promise<RecurringTemplate[]> {
    return recurringRepository.findAll(spaceId)
  },

  create(spaceId: string, input: CreateRecurringInput): Promise<RecurringTemplate> {
    return recurringRepository.create(spaceId, input)
  },

  async update(
    spaceId: string,
    id: string,
    input: UpdateRecurringInput
  ): Promise<RecurringTemplate> {
    const r = await recurringRepository.update(spaceId, id, input)
    if (!r) throw new NotFoundError('Plantilla no encontrada')
    return r
  },

  async remove(spaceId: string, id: string): Promise<void> {
    const ok = await recurringRepository.remove(spaceId, id)
    if (!ok) throw new NotFoundError('Plantilla no encontrada')
  },

  /**
   * Materializa todas las plantillas activas con nextDate <= hoy del space.
   * Por cada ocurrencia vencida crea una transacción y avanza nextDate según
   * la frecuencia. Compensa días sin abrir la app: si llevamos 3 meses fuera
   * con una plantilla mensual, se crean las 3 que tocaban.
   *
   * Se ejecuta secuencialmente (no en transacción atómica) porque el
   * repositorio actual no expone tx. Si falla a mitad, los días ya
   * procesados quedan registrados y al volver a llamar se reanuda desde
   * el nextDate avanzado: idempotente "per occurrence".
   */
  async processDue(spaceId: string, userId: string): Promise<ProcessRecurringResult> {
    const today = new Date().toISOString().slice(0, 10)
    const templates = (await recurringRepository.findAll(spaceId)).filter(
      (t) => t.active && t.nextDate <= today
    )
    if (templates.length === 0) return { count: 0 }

    let count = 0
    for (const tpl of templates) {
      // Categoría inferida: si la plantilla está vinculada a una deuda o
      // apartado, se respeta la convención de la app. Si no, "Otros".
      const category = tpl.debtId
        ? 'Deuda'
        : tpl.savingsAccountId
          ? 'Ahorro'
          : 'Otros'

      let date = tpl.nextDate
      while (date <= today) {
        await transactionService.create(spaceId, userId, {
          amount: tpl.amount,
          type: tpl.type,
          description: tpl.description,
          note: '',
          date,
          category,
          savingsAccountId: tpl.savingsAccountId,
          debtId: tpl.debtId,
        })
        count++
        date = advanceDate(date, tpl.frequency)
      }
      await recurringRepository.update(spaceId, tpl.id, { nextDate: date })
    }

    return { count }
  },
}
