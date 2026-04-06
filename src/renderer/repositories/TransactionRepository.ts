import type { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../../shared/types'

export interface TransactionRepository {
  getAll(): Promise<Transaction[]>
  create(data: CreateTransactionDTO): Promise<Transaction>
  delete(id: string): Promise<void>
  bulkDelete(ids: string[]): Promise<number>
  update(id: string, data: UpdateTransactionDTO): Promise<Transaction>
}
