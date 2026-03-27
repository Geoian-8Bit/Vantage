export interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string // YYYY-MM-DD
  category: string
  created_at: string // ISO timestamp
}

export interface CreateTransactionDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category: string
}

export interface UpdateTransactionDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category: string
}

export const CATEGORIES = {
  expense: ['Alimentación', 'Transporte', 'Alquiler', 'Ocio', 'Salud', 'Ropa', 'Servicios', 'Otros'] as const,
  income: ['Nómina', 'Bizum', 'Regalo', 'Inversión'] as const,
} as const

export const IPC_CHANNELS = {
  TRANSACTIONS_GET_ALL: 'db:transactions:getAll',
  TRANSACTIONS_CREATE: 'db:transactions:create',
  TRANSACTIONS_DELETE: 'db:transactions:delete',
  TRANSACTIONS_UPDATE: 'db:transactions:update',
} as const
