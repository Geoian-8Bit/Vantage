import type { Transaction, CreateTransactionDTO, UpdateTransactionDTO, Category, CreateCategoryDTO } from '../shared/types'

declare global {
  interface Window {
    api: {
      transactions: {
        getAll(): Promise<Transaction[]>
        create(data: CreateTransactionDTO): Promise<Transaction>
        delete(id: string): Promise<void>
        update(id: string, data: UpdateTransactionDTO): Promise<Transaction>
      }
      categories: {
        getAll(): Promise<Category[]>
        create(data: CreateCategoryDTO): Promise<Category>
        delete(id: string): Promise<void>
        update(id: string, name: string): Promise<Category>
      }
    }
  }
}
