import { TransactionForm } from '@/features/transactions/ui/TransactionForm'
import { TransactionList } from '@/features/transactions/ui/TransactionList'

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
        <p className="text-sm text-neutral-400">Registra y consulta tus ingresos y gastos.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <TransactionForm />
        <TransactionList />
      </div>
    </div>
  )
}
