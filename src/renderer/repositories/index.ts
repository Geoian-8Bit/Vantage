import type { TransactionRepository } from './TransactionRepository'
import { LocalTransactionRepository } from './LocalTransactionRepository'

// Singleton — en el futuro se puede cambiar por RemoteTransactionRepository
export const transactionRepository: TransactionRepository = new LocalTransactionRepository()

export type { TransactionRepository }
