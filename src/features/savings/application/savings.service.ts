import 'server-only'

import { NotFoundError } from '@/lib/api/errors'

import type {
  CreateSavingsInput,
  SavingsAccount,
  UpdateSavingsInput,
} from '../domain/savings.schema'
import { savingsRepository } from '../infrastructure/savings.repository'

export const savingsService = {
  list(spaceId: string): Promise<SavingsAccount[]> {
    return savingsRepository.findAll(spaceId)
  },

  create(spaceId: string, input: CreateSavingsInput): Promise<SavingsAccount> {
    return savingsRepository.create(spaceId, input)
  },

  async update(
    spaceId: string,
    id: string,
    input: UpdateSavingsInput
  ): Promise<SavingsAccount> {
    const acc = await savingsRepository.update(spaceId, id, input)
    if (!acc) throw new NotFoundError('Apartado no encontrado')
    return acc
  },

  async remove(spaceId: string, id: string): Promise<void> {
    const ok = await savingsRepository.remove(spaceId, id)
    if (!ok) throw new NotFoundError('Apartado no encontrado')
  },
}
