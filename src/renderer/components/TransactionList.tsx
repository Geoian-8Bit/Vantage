import type { Transaction } from '../../shared/types'
import { formatCurrency, formatDate } from '../lib/utils'

interface TransactionListProps {
  transactions: Transaction[]
  onDelete: (id: string) => Promise<void>
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl bg-card p-10 shadow-sm border border-border text-center">
        <div className="w-12 h-12 rounded-full bg-brand-light mx-auto mb-3 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <p className="text-subtext text-base">No hay transacciones</p>
        <p className="text-border text-sm mt-1">Registra tu primer gasto o ingreso</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-card shadow-sm border border-border overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_120px_120px_40px] px-5 py-3 border-b border-border bg-surface text-xs font-medium text-subtext uppercase tracking-wider">
        <span>Descripcion</span>
        <span className="text-right">Fecha</span>
        <span className="text-right">Monto</span>
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {transactions.map(transaction => (
          <div
            key={transaction.id}
            className="grid grid-cols-[1fr_120px_120px_40px] items-center px-5 py-3.5 hover:bg-surface/50 transition-colors"
          >
            {/* Description + type indicator */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  transaction.type === 'income' ? 'bg-income' : 'bg-expense'
                }`}
              />
              <span className="text-sm font-medium text-text truncate">
                {transaction.description || (transaction.type === 'income' ? 'Ingreso' : 'Gasto')}
              </span>
            </div>

            {/* Date */}
            <span className="text-sm text-subtext text-right">
              {formatDate(transaction.date)}
            </span>

            {/* Amount */}
            <span
              className={`text-sm font-semibold text-right ${
                transaction.type === 'income' ? 'text-income' : 'text-expense'
              }`}
            >
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>

            {/* Delete */}
            <div className="flex justify-end">
              <button
                onClick={() => onDelete(transaction.id)}
                className="text-border hover:text-expense transition-colors p-1 cursor-pointer"
                title="Eliminar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
