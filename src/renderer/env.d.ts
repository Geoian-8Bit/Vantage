import type { Transaction, CreateTransactionDTO } from '../shared/types'

declare global {
  interface Window {
    api: {
      transactions: {
        getAll(): Promise<Transaction[]>
        create(data: CreateTransactionDTO): Promise<Transaction>
        delete(id: string): Promise<void>
      }
    }
  }
}
