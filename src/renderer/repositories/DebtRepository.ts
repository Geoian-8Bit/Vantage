import type {
  Debt,
  CreateDebtDTO,
  UpdateDebtDTO,
  ExtraPaymentDTO,
} from '../../shared/types'

export type DebtFilter = 'active' | 'archived' | 'all'

export interface DebtRepository {
  getAll(filter?: DebtFilter): Promise<Debt[]>
  create(data: CreateDebtDTO): Promise<Debt>
  update(id: string, data: UpdateDebtDTO): Promise<Debt>
  delete(id: string): Promise<void>
  extraPayment(payload: ExtraPaymentDTO): Promise<{ debt: Debt; transactionId: string }>
}
