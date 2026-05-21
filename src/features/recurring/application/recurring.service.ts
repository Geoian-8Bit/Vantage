import 'server-only'

import { NotFoundError } from '@/lib/api/errors'

import type {
  CreateRecurringInput,
  RecurringTemplate,
  UpdateRecurringInput,
} from '../domain/recurring.schema'
import { recurringRepository } from '../infrastructure/recurring.repository'

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
}
