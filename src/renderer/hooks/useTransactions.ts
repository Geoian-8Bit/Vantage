import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Transaction, CreateTransactionDTO } from '../../shared/types'
import { transactionRepository } from '../repositories'

interface UseTransactionsReturn {
  transactions: Transaction[]
  loading: boolean
  error: string | null
  totalIncome: number
  totalExpenses: number
  balance: number
  addTransaction: (data: CreateTransactionDTO) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  async function loadTransactions(): Promise<void> {
    try {
      setLoading(true)
      setError(null)
      const data = await transactionRepository.getAll()
      setTransactions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar transacciones')
    } finally {
      setLoading(false)
    }
  }

  const addTransaction = useCallback(async (data: CreateTransactionDTO): Promise<void> => {
    try {
      setError(null)
      const newTransaction = await transactionRepository.create(data)
      setTransactions(prev => [newTransaction, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear transacción')
      throw err
    }
  }, [])

  const removeTransaction = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await transactionRepository.delete(id)
      setTransactions(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar transacción')
      throw err
    }
  }, [])

  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )

  const totalExpenses = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )

  const balance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses])

  return {
    transactions,
    loading,
    error,
    totalIncome,
    totalExpenses,
    balance,
    addTransaction,
    removeTransaction
  }
}
