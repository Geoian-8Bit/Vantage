import 'server-only'

import { NotFoundError } from '@/lib/api/errors'

import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  Transaction,
  UpdateTransactionInput,
} from '../domain/transaction.schema'
import { transactionRepository } from '../infrastructure/transaction.repository'

/**
 * Service: lógica de negocio sobre transactions. Recibe el spaceId resuelto
 * por el caller (la API route), por lo que aquí ya no se piensa en auth ni
 * en el user activo.
 */
export const transactionService = {
  list(spaceId: string, query: ListTransactionsQuery): Promise<Transaction[]> {
    return transactionRepository.findAll(spaceId, query)
  },

  async get(spaceId: string, id: string): Promise<Transaction> {
    const tx = await transactionRepository.findById(spaceId, id)
    if (!tx) throw new NotFoundError('Transacción no encontrada')
    return tx
  },

  create(spaceId: string, userId: string, input: CreateTransactionInput): Promise<Transaction> {
    return transactionRepository.create(spaceId, userId, input)
  },

  async update(
    spaceId: string,
    id: string,
    input: UpdateTransactionInput
  ): Promise<Transaction> {
    const tx = await transactionRepository.update(spaceId, id, input)
    if (!tx) throw new NotFoundError('Transacción no encontrada')
    return tx
  },

  async remove(spaceId: string, id: string): Promise<void> {
    const ok = await transactionRepository.remove(spaceId, id)
    if (!ok) throw new NotFoundError('Transacción no encontrada')
  },
}
