import { useState } from 'react'
import type { CreateTransactionDTO } from '../../shared/types'
import { getTodayString } from '../lib/utils'

interface TransactionFormProps {
  type: 'expense' | 'income'
  onSubmit: (data: CreateTransactionDTO) => Promise<void>
  onCancel: () => void
}

export function TransactionForm({ type, onSubmit, onCancel }: TransactionFormProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(getTodayString())
  const [submitting, setSubmitting] = useState(false)

  const isExpense = type === 'expense'

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) return
    if (!date) return

    setSubmitting(true)
    try {
      await onSubmit({
        amount: parsedAmount,
        type,
        description: description.trim(),
        date
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-subtext mb-1">Monto</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          required
          autoFocus
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-subtext mb-1">Descripcion</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={isExpense ? 'Ej: Supermercado, Alquiler...' : 'Ej: Nomina, Freelance...'}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-subtext mb-1">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-subtext bg-surface hover:bg-border transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !amount || !date}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer ${
            isExpense
              ? 'bg-expense hover:bg-expense-hover disabled:opacity-50'
              : 'bg-income hover:bg-income-hover disabled:opacity-50'
          }`}
        >
          {submitting ? 'Guardando...' : isExpense ? 'Registrar gasto' : 'Registrar ingreso'}
        </button>
      </div>
    </form>
  )
}
