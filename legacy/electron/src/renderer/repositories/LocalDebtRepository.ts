import type {
  Debt,
  CreateDebtDTO,
  UpdateDebtDTO,
  ExtraPaymentDTO,
} from '../../shared/types'
import type { DebtRepository, DebtFilter } from './DebtRepository'

export class LocalDebtRepository implements DebtRepository {
  async getAll(filter: DebtFilter = 'all'): Promise<Debt[]> {
    return window.api.debts.getAll(filter)
  }

  async create(data: CreateDebtDTO): Promise<Debt> {
    return window.api.debts.create(data)
  }

  async update(id: string, data: UpdateDebtDTO): Promise<Debt> {
    return window.api.debts.update(id, data)
  }

  async delete(id: string): Promise<void> {
    return window.api.debts.delete(id)
  }

  async extraPayment(payload: ExtraPaymentDTO): Promise<{ debt: Debt; transactionId: string }> {
    return window.api.debts.extraPayment(payload)
  }
}
