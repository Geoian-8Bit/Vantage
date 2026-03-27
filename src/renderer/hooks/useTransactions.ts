import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Transaction, CreateTransactionDTO, UpdateTransactionDTO } from '../../shared/types'
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
  updateTransaction: (id: string, data: UpdateTransactionDTO) => Promise<void>
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = useCallback(async (): Promise<void> => {
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
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

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

  const updateTransaction = useCallback(async (id: string, data: UpdateTransactionDTO): Promise<void> => {
    try {
      setError(null)
      const updated = await transactionRepository.update(id, data)
      setTransactions(prev => prev.map(t => t.id === id ? updated : t))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar transacción')
      throw err
    }
  }, [])

  const { totalIncome, totalExpenses } = useMemo(
    () => transactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.totalIncome += t.amount
        else acc.totalExpenses += t.amount
        return acc
      },
      { totalIncome: 0, totalExpenses: 0 }
    ),
    [transactions]
  )

  const balance = totalIncome - totalExpenses

  return {
    transactions,
    loading,
    error,
    totalIncome,
    totalExpenses,
    balance,
    addTransaction,
    removeTransaction,
    updateTransaction
  }
}
