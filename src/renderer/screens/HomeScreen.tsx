import { useState } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { PageHeader } from '../components/layout/PageHeader'
import { BalanceSummary } from '../components/BalanceSummary'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionList } from '../components/TransactionList'
import { Modal } from '../components/Modal'
import type { CreateTransactionDTO } from '../../shared/types'

type ModalType = 'expense' | 'income' | null

export function HomeScreen() {
  const {
    transactions,
    loading,
    error,
    totalIncome,
    totalExpenses,
    balance,
    addTransaction,
    removeTransaction
  } = useTransactions()

  const [modalType, setModalType] = useState<ModalType>(null)

  async function handleSubmit(data: CreateTransactionDTO): Promise<void> {
    await addTransaction(data)
    setModalType(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-subtext text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page header with action buttons */}
      <PageHeader
        section="Gastos"
        page="Listado"
        actions={
          <>
            <button
              onClick={() => setModalType('expense')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-expense hover:bg-expense-hover transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Gasto
            </button>
            <button
              onClick={() => setModalType('income')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-income hover:bg-income-hover transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Ingreso
            </button>
          </>
        }
      />

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-error-light border border-error/20 p-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Balance cards */}
      <BalanceSummary
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        balance={balance}
      />

      {/* Transaction list */}
      <TransactionList
        transactions={transactions}
        onDelete={removeTransaction}
      />

      {/* Modal for adding transactions */}
      <Modal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={modalType === 'expense' ? 'Nuevo gasto' : 'Nuevo ingreso'}
      >
        {modalType && (
          <TransactionForm
            type={modalType}
            onSubmit={handleSubmit}
            onCancel={() => setModalType(null)}
          />
        )}
      </Modal>
    </div>
  )
}
