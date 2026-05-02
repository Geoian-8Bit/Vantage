import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  SavingsAccount,
  CreateSavingsAccountDTO,
  UpdateSavingsAccountDTO,
} from '../../shared/types'
import { savingsRepository } from '../repositories'

interface UseSavingsReturn {
  accounts: SavingsAccount[]
  loading: boolean
  error: string | null
  totalSavings: number
  loadAccounts: () => Promise<void>
  addAccount: (data: CreateSavingsAccountDTO) => Promise<SavingsAccount>
  editAccount: (id: string, data: UpdateSavingsAccountDTO) => Promise<SavingsAccount>
  removeAccount: (id: string) => Promise<void>
}

export function useSavings(): UseSavingsReturn {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAccounts = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const data = await savingsRepository.getAll()
      setAccounts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los apartados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const addAccount = useCallback(async (data: CreateSavingsAccountDTO): Promise<SavingsAccount> => {
    try {
      setError(null)
      const created = await savingsRepository.create(data)
      setAccounts(prev => [...prev, created])
      return created
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el apartado')
      throw err
    }
  }, [])

  const editAccount = useCallback(async (id: string, data: UpdateSavingsAccountDTO): Promise<SavingsAccount> => {
    try {
      setError(null)
      const updated = await savingsRepository.update(id, data)
      setAccounts(prev => prev.map(a => a.id === id ? updated : a))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el apartado')
      throw err
    }
  }, [])

  const removeAccount = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await savingsRepository.delete(id)
      setAccounts(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el apartado')
      throw err
    }
  }, [])

  const totalSavings = useMemo(
    () => accounts.reduce((acc, a) => acc + a.balance, 0),
    [accounts]
  )

  return {
    accounts,
    loading,
    error,
    totalSavings,
    loadAccounts,
    addAccount,
    editAccount,
    removeAccount,
  }
}
