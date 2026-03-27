export interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string // YYYY-MM-DD
  created_at: string // ISO timestamp
}

export interface CreateTransactionDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
}

export const IPC_CHANNELS = {
  TRANSACTIONS_GET_ALL: 'db:transactions:getAll',
  TRANSACTIONS_CREATE: 'db:transactions:create',
  TRANSACTIONS_DELETE: 'db:transactions:delete',
} as const
