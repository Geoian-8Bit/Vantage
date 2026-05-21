import type {
  SavingsAccount,
  CreateSavingsAccountDTO,
  UpdateSavingsAccountDTO,
} from '../../shared/types'

export interface SavingsRepository {
  getAll(): Promise<SavingsAccount[]>
  create(data: CreateSavingsAccountDTO): Promise<SavingsAccount>
  update(id: string, data: UpdateSavingsAccountDTO): Promise<SavingsAccount>
  delete(id: string): Promise<void>
}
