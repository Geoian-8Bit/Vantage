import type { Transaction, CreateTransactionDTO } from '../../shared/types'
import type { TransactionRepository } from './TransactionRepository'

export class LocalTransactionRepository implements TransactionRepository {
  async getAll(): Promise<Transaction[]> {
    return window.api.transactions.getAll()
  }

  async create(data: CreateTransactionDTO): Promise<Transaction> {
    return window.api.transactions.create(data)
  }

  async delete(id: string): Promise<void> {
    return window.api.transactions.delete(id)
  }
}
