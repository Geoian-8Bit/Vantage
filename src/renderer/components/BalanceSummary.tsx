import { formatCurrency } from '../lib/utils'
import { TiltCard } from './TiltCard'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

interface BalanceSummaryProps {
  totalIncome: number
  totalExpenses: number
  balance: number
}

export function BalanceSummary({ totalIncome, totalExpenses, balance }: BalanceSummaryProps) {
  const animIncome = useAnimatedNumber(totalIncome)
  const animExpenses = useAnimatedNumber(totalExpenses)
  const animBalance = useAnimatedNumber(balance)

  return (
    <div className="grid grid-cols-3 gap-3 lg:gap-4">
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

      {/* Balance */}
      <TiltCard
        intensity={3}
        className={`card-anim rounded-xl p-5 shadow-sm border ${balance >= 0 ? 'bg-income-light border-income/20' : 'bg-expense-light border-expense/20'}`}
        style={{ animationDelay: '120ms' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${balance >= 0 ? 'bg-income/15' : 'bg-expense/15'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={balance >= 0 ? 'text-income' : 'text-expense'}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-subtext">Balance</p>
        </div>
        <p
          className={`font-bold tabular-nums truncate ${balance >= 0 ? 'text-income' : 'text-expense'}`}
          style={{ fontSize: 'clamp(1.125rem, 2vw, 1.5rem)', lineHeight: 1.2 }}
          title={`${balance >= 0 ? '+' : ''}${formatCurrency(balance)}`}
        >
          {balance >= 0 ? '+' : ''}{formatCurrency(animBalance)}
        </p>
      </TiltCard>
    </div>
  )
}
