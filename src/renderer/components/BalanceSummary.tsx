import { formatCurrency } from '../lib/utils'

interface BalanceSummaryProps {
  totalIncome: number
  totalExpenses: number
  balance: number
}

export function BalanceSummary({ totalIncome, totalExpenses, balance }: BalanceSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-income" />
          <p className="text-sm font-medium text-subtext">Ingresos</p>
        </div>
        <p className="text-2xl font-bold text-income">
          {formatCurrency(totalIncome)}
        </p>
      </div>

      <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-expense" />
          <p className="text-sm font-medium text-subtext">Gastos</p>
        </div>
        <p className="text-2xl font-bold text-expense">
          {formatCurrency(totalExpenses)}
        </p>
      </div>

      <div
        className={`rounded-xl p-5 shadow-sm border ${balance >= 0 ? 'bg-income-light border-income/30' : 'bg-expense-light border-expense/30'}`}
        style={{ borderLeftWidth: '4px', borderLeftColor: balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${balance >= 0 ? 'bg-income' : 'bg-expense'}`} />
          <p className="text-sm font-medium text-subtext">Balance</p>
        </div>
        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
          {formatCurrency(balance)}
        </p>
      </div>
    </div>
  )
}
