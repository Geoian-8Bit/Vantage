'use client'

import { useAnimatedNumber } from '@/lib/hooks/useAnimatedNumber'
import { formatCurrency } from '@/lib/utils/format'

interface BalanceSummaryProps {
  totalIncome: number
  totalExpenses: number
  balance: number
  carryover?: number
  showCarryover?: boolean
}

export function BalanceSummary({
  totalIncome,
  totalExpenses,
  balance,
  carryover = 0,
  showCarryover = false,
}: BalanceSummaryProps) {
  const animIncome = useAnimatedNumber(totalIncome)
  const animExpenses = useAnimatedNumber(totalExpenses)
  const totalAvailable = balance + (showCarryover ? carryover : 0)
  const animBalance = useAnimatedNumber(totalAvailable)
  const animCarryover = useAnimatedNumber(carryover)

  const balanceLabel = showCarryover ? 'Disponible total' : 'Balance'
  const balanceLabelShort = showCarryover ? 'Disponible' : 'Balance'
  const carryoverPositive = carryover >= 0

  const gridCols = showCarryover
    ? 'grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4'
    : 'grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4'

  return (
    <div className={gridCols}>
      <div
        className="card-anim rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5"
        style={{ animationDelay: '0ms' }}
      >
        <div className="hidden items-center gap-2 sm:mb-2 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-income-light">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-income"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-subtext">Ingresos</p>
        </div>
        <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-subtext uppercase sm:hidden">
          Ingresos
        </p>
        <p
          className="truncate font-bold tabular-nums text-income"
          style={{ fontSize: 'clamp(0.95rem, 4.5vw, 1.5rem)', lineHeight: 1.2 }}
          title={formatCurrency(totalIncome)}
        >
          {formatCurrency(animIncome)}
        </p>
      </div>

      <div
        className="card-anim rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5"
        style={{ animationDelay: '60ms' }}
      >
        <div className="hidden items-center gap-2 sm:mb-2 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-expense-light">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-expense"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-subtext">Gastos</p>
        </div>
        <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-subtext uppercase sm:hidden">
          Gastos
        </p>
        <p
          className="truncate font-bold tabular-nums text-expense"
          style={{ fontSize: 'clamp(0.95rem, 4.5vw, 1.5rem)', lineHeight: 1.2 }}
          title={formatCurrency(totalExpenses)}
        >
          {formatCurrency(animExpenses)}
        </p>
      </div>

      {showCarryover && (
        <div
          className={`card-anim rounded-xl border p-3 shadow-sm sm:p-5 ${
            carryoverPositive ? 'border-border bg-surface' : 'border-expense/20 bg-expense-light/60'
          }`}
          style={{ animationDelay: '90ms' }}
        >
          <div className="hidden items-center gap-2 sm:mb-2 sm:flex">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                carryoverPositive ? 'border border-border bg-card' : 'bg-expense/15'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={carryoverPositive ? 'text-subtext' : 'text-expense'}
              >
                <path d="M17 2.1l4 4-4 4" />
                <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4" />
                <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-subtext">De meses anteriores</p>
          </div>
          <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-subtext uppercase sm:hidden">
            Acarreado
          </p>
          <p
            className={`truncate font-bold tabular-nums ${carryoverPositive ? 'text-income' : 'text-expense'}`}
            style={{ fontSize: 'clamp(0.95rem, 4.5vw, 1.5rem)', lineHeight: 1.2 }}
            title={`${carryoverPositive ? '+' : ''}${formatCurrency(carryover)}`}
          >
            {carryoverPositive ? '+' : ''}
            {formatCurrency(animCarryover)}
          </p>
        </div>
      )}

      <div
        className={`card-anim rounded-xl border p-3 shadow-sm sm:p-5 ${
          totalAvailable >= 0 ? 'border-income/20 bg-income-light' : 'border-expense/20 bg-expense-light'
        }`}
        style={{ animationDelay: '120ms' }}
      >
        <div className="hidden items-center gap-2 sm:mb-2 sm:flex">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              totalAvailable >= 0 ? 'bg-income/15' : 'bg-expense/15'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={totalAvailable >= 0 ? 'text-income' : 'text-expense'}
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-subtext">{balanceLabel}</p>
        </div>
        <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-subtext uppercase sm:hidden">
          {balanceLabelShort}
        </p>
        <p
          className={`truncate font-bold tabular-nums ${totalAvailable >= 0 ? 'text-income' : 'text-expense'}`}
          style={{ fontSize: 'clamp(0.95rem, 4.5vw, 1.5rem)', lineHeight: 1.2 }}
          title={`${totalAvailable >= 0 ? '+' : ''}${formatCurrency(totalAvailable)}`}
        >
          {totalAvailable >= 0 ? '+' : ''}
          {formatCurrency(animBalance)}
        </p>
      </div>
    </div>
  )
}
