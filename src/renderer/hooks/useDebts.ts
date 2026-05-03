import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  Debt,
  CreateDebtDTO,
  UpdateDebtDTO,
  ExtraPaymentDTO,
} from '../../shared/types'
import { debtRepository } from '../repositories'

interface UseDebtsReturn {
  debts: Debt[]
  activeDebts: Debt[]
  archivedDebts: Debt[]
  loading: boolean
  error: string | null
  totalPending: number
  totalPaid: number
  totalInitial: number
  totalMonthly: number
  loadDebts: () => Promise<void>
  addDebt: (data: CreateDebtDTO) => Promise<Debt>
  editDebt: (id: string, data: UpdateDebtDTO) => Promise<Debt>
  removeDebt: (id: string) => Promise<void>
  extraPayment: (payload: ExtraPaymentDTO) => Promise<Debt>
}

export function useDebts(): UseDebtsReturn {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDebts = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const data = await debtRepository.getAll('all')
      setDebts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las deudas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDebts() }, [loadDebts])

  const addDebt = useCallback(async (data: CreateDebtDTO): Promise<Debt> => {
    try {
      setError(null)
      const created = await debtRepository.create(data)
      setDebts(prev => [...prev, created])
      return created
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la deuda')
      throw err
    }
  }, [])

  const editDebt = useCallback(async (id: string, data: UpdateDebtDTO): Promise<Debt> => {
    try {
      setError(null)
      const updated = await debtRepository.update(id, data)
      setDebts(prev => prev.map(d => d.id === id ? updated : d))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la deuda')
      throw err
    }
  }, [])

  const removeDebt = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await debtRepository.delete(id)
      setDebts(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la deuda')
      throw err
    }
  }, [])

  const extraPayment = useCallback(async (payload: ExtraPaymentDTO): Promise<Debt> => {
    try {
      setError(null)
      const { debt } = await debtRepository.extraPayment(payload)
      setDebts(prev => prev.map(d => d.id === debt.id ? debt : d))
      return debt
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago extra')
      throw err
    }
  }, [])

  const activeDebts = useMemo(() => debts.filter(d => !d.archived_at), [debts])
  const archivedDebts = useMemo(() => debts.filter(d => d.archived_at), [debts])
  const totalPending = useMemo(() => activeDebts.reduce((acc, d) => acc + d.pending, 0), [activeDebts])
  const totalPaid = useMemo(() => activeDebts.reduce((acc, d) => acc + d.paid, 0), [activeDebts])
  const totalInitial = useMemo(() => activeDebts.reduce((acc, d) => acc + d.initial_amount, 0), [activeDebts])
  const totalMonthly = useMemo(() => activeDebts.reduce((acc, d) => acc + d.monthly_amount, 0), [activeDebts])

  return {
    debts,
    activeDebts,
    archivedDebts,
    loading,
    error,
    totalPending,
    totalPaid,
    totalInitial,
    totalMonthly,
    loadDebts,
    addDebt,
    editDebt,
    removeDebt,
    extraPayment,
  }
}
