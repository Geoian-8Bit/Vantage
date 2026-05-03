import type { TransactionRepository } from './TransactionRepository'
import { LocalTransactionRepository } from './LocalTransactionRepository'
import type { SavingsRepository } from './SavingsRepository'
import { LocalSavingsRepository } from './LocalSavingsRepository'
import type { DebtRepository } from './DebtRepository'
import { LocalDebtRepository } from './LocalDebtRepository'

// Singleton — en el futuro se puede cambiar por RemoteTransactionRepository
export const transactionRepository: TransactionRepository = new LocalTransactionRepository()
export const savingsRepository: SavingsRepository = new LocalSavingsRepository()
export const debtRepository: DebtRepository = new LocalDebtRepository()

export type { TransactionRepository, SavingsRepository, DebtRepository }
