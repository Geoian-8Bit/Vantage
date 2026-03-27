import type { Transaction, CreateTransactionDTO } from '../../shared/types'

export interface TransactionRepository {
  getAll(): Promise<Transaction[]>
  create(data: CreateTransactionDTO): Promise<Transaction>
  delete(id: string): Promise<void>
}
