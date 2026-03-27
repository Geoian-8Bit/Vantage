import type { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../shared/types'

declare global {
  interface Window {
    api: {
      transactions: {
        getAll(): Promise<Transaction[]>
        create(data: CreateTransactionDTO): Promise<Transaction>
        delete(id: string): Promise<void>
        update(id: string, data: UpdateTransactionDTO): Promise<Transaction>
      }
    }
  }
}
