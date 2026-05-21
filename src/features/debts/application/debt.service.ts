import 'server-only'

import { NotFoundError } from '@/lib/api/errors'

import type { CreateDebtInput, Debt, UpdateDebtInput } from '../domain/debt.schema'
import { debtRepository } from '../infrastructure/debt.repository'

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
}
