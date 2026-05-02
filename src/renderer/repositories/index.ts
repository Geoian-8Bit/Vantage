import type { TransactionRepository } from './TransactionRepository'
import { LocalTransactionRepository } from './LocalTransactionRepository'
import type { SavingsRepository } from './SavingsRepository'
import { LocalSavingsRepository } from './LocalSavingsRepository'

// Singleton — en el futuro se puede cambiar por RemoteTransactionRepository
export const transactionRepository: TransactionRepository = new LocalTransactionRepository()
export const savingsRepository: SavingsRepository = new LocalSavingsRepository()

export type { TransactionRepository, SavingsRepository }
