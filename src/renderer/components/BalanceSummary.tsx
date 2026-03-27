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

      <div className="rounded-xl bg-card p-5 shadow-sm border border-border relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <p className="text-sm font-medium text-subtext">Balance</p>
        </div>
        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
          {formatCurrency(balance)}
        </p>
        {/* Decorative accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
      </div>
    </div>
  )
}
