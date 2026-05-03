import { formatCurrency } from '../lib/utils'
import { TiltCard } from './TiltCard'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

interface BalanceSummaryProps {
  totalIncome: number
  totalExpenses: number
  balance: number
  /** Saldo acumulado de periodos anteriores al actual (rollover). Solo se
   *  muestra si `showCarryover` es true. */
  carryover?: number
  /** Si true, se renderiza una 4ª tarjeta con el carryover y el balance pasa
   *  a ser "Disponible total" = balance + carryover. */
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
  const carryoverPositive = carryover >= 0

  const gridCols = showCarryover
    ? 'grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4'
    : 'grid grid-cols-3 gap-3 lg:gap-4'

  return (
    <div className={gridCols}>
      {/* Income */}
      <TiltCard intensity={3} className="card-anim rounded-xl bg-card p-5 shadow-sm border border-border" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-income-light flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-income">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-subtext">Ingresos</p>
        </div>
        <p
          className="font-bold text-income tabular-nums truncate"
          style={{ fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', lineHeight: 1.2 }}
          title={formatCurrency(totalIncome)}
        >
          {formatCurrency(animIncome)}
        </p>
      </TiltCard>

      {/* Expenses */}
      <TiltCard intensity={3} className="card-anim rounded-xl bg-card p-5 shadow-sm border border-border" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-expense-light flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-expense">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-subtext">Gastos</p>
        </div>
        <p
          className="font-bold text-expense tabular-nums truncate"
          style={{ fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', lineHeight: 1.2 }}
          title={formatCurrency(totalExpenses)}
        >
          {formatCurrency(animExpenses)}
        </p>
      </TiltCard>

      {/* Carryover (rollover de meses anteriores) */}
      {showCarryover && (
        <TiltCard
          intensity={3}
          className="card-anim rounded-xl bg-surface p-5 shadow-sm border border-border"
          style={{ animationDelay: '90ms' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-subtext">
                <path d="M17 2.1l4 4-4 4" />
                <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4" />
                <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-subtext">De meses anteriores</p>
          </div>
          <p
            className={`font-bold tabular-nums truncate ${carryoverPositive ? 'text-income' : 'text-expense'}`}
            style={{ fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', lineHeight: 1.2 }}
            title={`${carryoverPositive ? '+' : ''}${formatCurrency(carryover)}`}
          >
            {carryoverPositive ? '+' : ''}{formatCurrency(animCarryover)}
          </p>
        </TiltCard>
      )}

      {/* Balance / Disponible total */}
      <TiltCard
        intensity={3}
        className={`card-anim rounded-xl p-5 shadow-sm border ${totalAvailable >= 0 ? 'bg-income-light border-income/20' : 'bg-expense-light border-expense/20'}`}
        style={{ animationDelay: '120ms' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${totalAvailable >= 0 ? 'bg-income/15' : 'bg-expense/15'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={totalAvailable >= 0 ? 'text-income' : 'text-expense'}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-subtext">{balanceLabel}</p>
        </div>
        <p
          className={`font-bold tabular-nums truncate ${totalAvailable >= 0 ? 'text-income' : 'text-expense'}`}
          style={{ fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', lineHeight: 1.2 }}
          title={`${totalAvailable >= 0 ? '+' : ''}${formatCurrency(totalAvailable)}`}
        >
          {totalAvailable >= 0 ? '+' : ''}{formatCurrency(animBalance)}
        </p>
      </TiltCard>
    </div>
  )
}
