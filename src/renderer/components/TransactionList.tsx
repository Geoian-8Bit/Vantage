import type { Transaction } from '../../shared/types'
import { formatCurrency, formatDate } from '../lib/utils'

const CATEGORY_STYLE: Record<string, { background: string; color: string }> = {
  'Alimentación': { background: '#FFF7ED', color: '#C2410C' },
  'Transporte':   { background: '#EFF6FF', color: '#1D4ED8' },
  'Alquiler':     { background: '#F5F3FF', color: '#6D28D9' },
  'Ocio':         { background: '#FFF1F2', color: '#BE185D' },
  'Salud':        { background: '#F0FDFA', color: '#0F766E' },
  'Ropa':         { background: '#EEF2FF', color: '#4338CA' },
  'Servicios':    { background: '#F0F9FF', color: '#0369A1' },
  'Nómina':       { background: '#F0FDF4', color: '#15803D' },
  'Bizum':        { background: '#ECFDF5', color: '#059669' },
  'Regalo':       { background: '#FFF1F2', color: '#BE185D' },
  'Inversión':    { background: '#FDF4FF', color: '#7C3AED' },
  'Otros':        { background: '#F7F6F5', color: '#6B6B6F' },
}

interface TransactionListProps {
  transactions: Transaction[]
  onDelete: (id: string) => void
  onEdit: (transaction: Transaction) => void
  emptyMessage?: string
}

export function TransactionList({ transactions, onDelete, onEdit, emptyMessage = 'No hay transacciones' }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl bg-card p-10 shadow-sm border border-border text-center">
        <div className="w-12 h-12 rounded-full bg-brand-light mx-auto mb-3 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <p className="text-subtext text-base">{emptyMessage}</p>
        <p className="text-subtext text-sm mt-1">Registra tu primer gasto o ingreso</p>
      </div>
    )
  }

  return (
    <div role="table" aria-label="Lista de transacciones" className="rounded-xl bg-card shadow-sm border border-border overflow-hidden">
      {/* Table header */}
      <div role="row" className="grid grid-cols-[1fr_130px_110px_110px_80px] px-5 py-3 border-b border-border bg-surface text-xs font-medium text-subtext uppercase tracking-wider">
        <span role="columnheader">Descripción</span>
        <span role="columnheader" className="text-center">Categoría</span>
        <span role="columnheader" className="text-right">Fecha</span>
        <span role="columnheader" className="text-right">Cantidad</span>
        <span role="columnheader" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {transactions.map(transaction => (
          <div
            key={transaction.id}
            role="row"
            className="grid grid-cols-[1fr_130px_110px_110px_80px] items-center px-5 py-3.5 hover:bg-surface/50 transition-colors"
          >
            {/* Description + type indicator */}
            <div role="cell" className="flex items-center gap-3 min-w-0">
              <div
                aria-label={transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  transaction.type === 'income' ? 'bg-income-light' : 'bg-expense-light'
                }`}
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={transaction.type === 'income' ? 'text-income' : 'text-expense'}>
                  {transaction.type === 'income'
                    ? <path d="M12 19V5M5 12l7-7 7 7" />
                    : <path d="M12 5v14M5 12l7 7 7-7" />
                  }
                </svg>
              </div>
              <span className="text-sm font-medium text-text truncate">
                {transaction.description || (transaction.type === 'income' ? 'Ingreso' : 'Gasto')}
              </span>
            </div>

            {/* Category */}
            <div role="cell" className="flex justify-center">
              {transaction.category && (() => {
                const style = CATEGORY_STYLE[transaction.category] ?? CATEGORY_STYLE['Otros']
                return (
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: style.background, color: style.color }}
                  >
                    {transaction.category}
                  </span>
                )
              })()}
            </div>

            {/* Date */}
            <span role="cell" className="text-sm text-subtext text-right">
              {formatDate(transaction.date)}
            </span>

            {/* Amount */}
            <span
              role="cell"
              className={`text-sm font-semibold text-right ${
                transaction.type === 'income' ? 'text-income' : 'text-expense'
              }`}
            >
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>

            {/* Actions */}
            <div role="cell" className="flex justify-end gap-1">
              <button
                onClick={() => onEdit(transaction)}
                aria-label={`Editar: ${transaction.description || (transaction.type === 'income' ? 'Ingreso' : 'Gasto')}`}
                className="rounded-md p-2.5 text-subtext hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(transaction.id)}
                aria-label={`Eliminar: ${transaction.description || (transaction.type === 'income' ? 'Ingreso' : 'Gasto')}`}
                className="rounded-md p-2.5 text-subtext hover:bg-expense-light hover:text-expense transition-colors cursor-pointer"
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
