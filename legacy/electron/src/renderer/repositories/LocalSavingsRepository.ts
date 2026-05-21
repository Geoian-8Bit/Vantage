import type {
  SavingsAccount,
  CreateSavingsAccountDTO,
  UpdateSavingsAccountDTO,
} from '../../shared/types'
import type { SavingsRepository } from './SavingsRepository'

export class LocalSavingsRepository implements SavingsRepository {
  async getAll(): Promise<SavingsAccount[]> {
    return window.api.savings.getAll()
  }

  async create(data: CreateSavingsAccountDTO): Promise<SavingsAccount> {
    return window.api.savings.create(data)
  }

  async update(id: string, data: UpdateSavingsAccountDTO): Promise<SavingsAccount> {
    return window.api.savings.update(id, data)
  }

  async delete(id: string): Promise<void> {
    return window.api.savings.delete(id)
  }
}
