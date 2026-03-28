import { useState } from 'react'
import type { CreateTransactionDTO, CreateRecurringTemplateDTO, RecurringFrequency } from '../../shared/types'
import { useCategories } from '../hooks/useCategories'
import { getTodayString } from '../lib/utils'

interface TransactionFormProps {
  type: 'expense' | 'income'
  onSubmit: (data: CreateTransactionDTO) => Promise<void>
  onCancel: () => void
  initialValues?: { amount: string; description: string; date: string; category: string; note?: string }
  /** If provided, a "Repeat automatically" toggle appears in create mode */
  onSubmitRecurring?: (dto: CreateRecurringTemplateDTO) => Promise<void>
}

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly',    label: 'Semanal'     },
  { value: 'monthly',   label: 'Mensual'     },
  { value: 'quarterly', label: 'Trimestral'  },
  { value: 'annual',    label: 'Anual'       },
]

export function TransactionForm({ type, onSubmit, onCancel, initialValues, onSubmitRecurring }: TransactionFormProps) {
  const { categories, loading: catsLoading } = useCategories()

  const availableCategories = categories.filter(c => c.type === type)

  const resolvedInitialCategory = initialValues?.category
    ?? (availableCategories[0]?.name ?? '')

  const [amount,      setAmount]      = useState(initialValues?.amount ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [date,        setDate]        = useState(initialValues?.date ?? getTodayString())
  const [category,    setCategory]    = useState(resolvedInitialCategory)
  const [note,        setNote]        = useState(initialValues?.note ?? '')
  const [submitting,  setSubmitting]  = useState(false)

  // Recurring fields — only shown in create mode when onSubmitRecurring is available
  const showRecurringToggle = !!onSubmitRecurring && !initialValues
  const [isRecurring,  setIsRecurring]  = useState(false)
  const [frequency,    setFrequency]    = useState<RecurringFrequency>('monthly')

  const isExpense   = type === 'expense'
  const accentColor = isExpense ? 'text-expense' : 'text-income'
  const accentBg    = isExpense ? 'bg-expense'   : 'bg-income'
  const accentHover = isExpense ? 'hover:bg-expense-hover' : 'hover:bg-income-hover'

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) return
    if (!date) return
    setSubmitting(true)
    try {
      if (isRecurring && onSubmitRecurring) {
        await onSubmitRecurring({
          amount:      parsedAmount,
          type,
          description: description.trim(),
          category,
          frequency,
          start_date:  date,
        })
      } else {
        await onSubmit({ amount: parsedAmount, type, description: description.trim(), date, category, note: note.trim() })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
          Cantidad
        </label>
        <div className="relative">
          <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold pointer-events-none ${accentColor}`}>
            €
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0,00"
            required
            autoFocus
            className="w-full rounded-xl border-2 border-border bg-surface pl-10 pr-4 py-3.5 text-2xl font-bold text-text text-right focus:outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
          Descripción
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={isExpense ? 'Ej: Supermercado, Alquiler…' : 'Ej: Nómina, Freelance…'}
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Category chips */}
      <div>
        <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
          Categoría
        </label>
        {catsLoading ? (
          <p className="text-sm text-subtext">Cargando categorías…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableCategories.map(cat => {
              const isSelected = category === cat.name
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? `${accentBg} text-white shadow-sm`
                      : 'bg-surface border border-border text-subtext hover:border-brand/40 hover:text-text'
                  }`}
                >
                  {cat.name}
                </button>
              )
            })}
            {availableCategories.length === 0 && (
              <p className="text-sm text-subtext italic">
                No hay categorías. Añade una en Ajustes.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
          Fecha
        </label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
          Nota <span className="normal-case font-normal text-subtext/60">(opcional)</span>
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Añade un comentario…"
          rows={2}
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
        />
      </div>

      {/* Recurring toggle — create mode only */}
      {showRecurringToggle && (
        <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsRecurring(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${isRecurring ? 'bg-brand' : 'bg-border'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isRecurring ? 'translate-x-5' : ''}`}
              />
            </div>
            <span className="text-sm font-semibold text-text">Repetir automáticamente</span>
          </label>

          {isRecurring && (
            <div>
              <p className="text-xs text-subtext mb-2">Frecuencia</p>
              <div className="flex gap-2 flex-wrap">
                {FREQ_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFrequency(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      frequency === opt.value
                        ? `${accentBg} text-white shadow-sm`
                        : 'bg-surface border border-border text-subtext hover:border-brand/40 hover:text-text'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface hover:bg-border transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !amount || !date}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer ${accentBg} ${accentHover} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {submitting
            ? 'Guardando…'
            : isRecurring
              ? (isExpense ? 'Crear recurrente' : 'Crear recurrente')
              : initialValues
                ? 'Guardar cambios'
                : isExpense ? 'Registrar gasto' : 'Registrar ingreso'
          }
        </button>
      </div>
    </form>
  )
}
