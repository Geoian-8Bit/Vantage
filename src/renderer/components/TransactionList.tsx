import { useMemo } from 'react'
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
      <div className="rounded-xl bg-card p-12 shadow-sm border border-border text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface border border-border mx-auto mb-4 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-subtext">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <p className="text-base font-medium text-text">{emptyMessage}</p>
        <p className="text-sm text-subtext mt-1">Pulsa «+ Gasto» o «+ Ingreso» para empezar</p>
      </div>
    )
  }

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  )

  return (
    <div className="rounded-xl bg-card shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_110px_56px] lg:grid-cols-[1fr_140px_110px_120px_72px] px-4 lg:px-5 py-3 border-b border-border bg-surface text-xs font-semibold text-subtext uppercase tracking-wider">
        <span>Descripción</span>
        <span className="hidden lg:block">Categoría</span>
        <span className="hidden lg:block text-right">Fecha</span>
        <span className="text-right">Cantidad</span>
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/40">
        {sorted.map(transaction => {
          const style = CATEGORY_STYLE[transaction.category] ?? CATEGORY_STYLE['Otros']

          return (
            <div
              key={transaction.id}
              className="group grid grid-cols-[1fr_110px_56px] lg:grid-cols-[1fr_140px_110px_120px_72px] items-center px-4 lg:px-5 py-3.5 hover:bg-surface/60 transition-colors"
            >
              {/* Description + type indicator */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  aria-label={transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${transaction.type === 'income' ? 'bg-income-light' : 'bg-expense-light'}`}
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={transaction.type === 'income' ? 'text-income' : 'text-expense'}>
                    {transaction.type === 'income'
                      ? <path d="M12 19V5M5 12l7-7 7 7" />
                      : <path d="M12 5v14M5 12l7 7 7-7" />
                    }
                  </svg>
                </div>
                <span className="text-sm font-semibold text-text truncate">
                  {transaction.description || (transaction.type === 'income' ? 'Ingreso' : 'Gasto')}
                </span>
                {transaction.note && (
                  <span
                    title={transaction.note}
                    className="shrink-0 text-subtext/60 hover:text-subtext transition-colors cursor-default"
                    aria-label={`Nota: ${transaction.note}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                )}
              </div>

              {/* Category — hidden on small viewports */}
              <span
                className="hidden lg:block px-2.5 py-1 rounded-full text-xs font-semibold w-fit whitespace-nowrap"
                style={{ background: style.background, color: style.color }}
              >
                {transaction.category}
              </span>

              {/* Date — hidden on small viewports */}
              <span className="hidden lg:block text-sm text-subtext text-right tabular-nums">
                {formatDate(transaction.date)}
              </span>

              {/* Amount */}
              <span className={`text-xs lg:text-sm font-bold text-right tabular-nums ${transaction.type === 'income' ? 'text-income' : 'text-expense'}`}>
                {(transaction.amount >= 0) === (transaction.type === 'income') ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount))}
              </span>

              {/* Actions */}
              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(transaction)}
                  aria-label={`Editar: ${transaction.description || 'transacción'}`}
                  className="rounded-lg p-2 text-subtext hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(transaction.id)}
                  aria-label={`Eliminar: ${transaction.description || 'transacción'}`}
                  className="rounded-lg p-2 text-subtext hover:bg-expense-light hover:text-expense transition-colors cursor-pointer"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
