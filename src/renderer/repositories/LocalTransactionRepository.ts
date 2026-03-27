import type { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../../shared/types'
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

  async update(id: string, data: UpdateTransactionDTO): Promise<Transaction> {
    return window.api.transactions.update(id, data)
  }
}
