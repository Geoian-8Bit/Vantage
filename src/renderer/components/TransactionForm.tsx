import { useState, useEffect } from 'react'
import type { CreateTransactionDTO, CreateRecurringTemplateDTO, RecurringFrequency } from '../../shared/types'
import { useCategories } from '../hooks/useCategories'
import { getTodayString } from '../lib/utils'
import { DateInput } from './DateInput'
import { Skeleton } from './Skeleton'

interface TransactionFormProps {
  type: 'expense' | 'income'
  onSubmit: (data: CreateTransactionDTO) => Promise<void>
  onCancel: () => void
  initialValues?: { amount: string; description: string; date: string; category: string; note?: string }
  /** If provided, a "Repeat automatically" toggle appears in create mode */
  onSubmitRecurring?: (dto: CreateRecurringTemplateDTO) => Promise<void>
  /** Callback que recibe true cuando el form tiene cambios sin guardar */
  onDirtyChange?: (dirty: boolean) => void
}

const PAYMENT_METHODS = ['Efectivo', 'Visa', 'Transferencia', 'Bizum'] as const

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly',    label: 'Semanal'     },
  { value: 'monthly',   label: 'Mensual'     },
  { value: 'quarterly', label: 'Trimestral'  },
  { value: 'annual',    label: 'Anual'       },
]

export function TransactionForm({ type, onSubmit, onCancel, initialValues, onSubmitRecurring, onDirtyChange }: TransactionFormProps) {
  const { categories, loading: catsLoading } = useCategories()

  const availableCategories = categories.filter(c => c.type === type)

  const [amount,      setAmount]      = useState(initialValues?.amount ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [date,        setDate]        = useState(initialValues?.date ?? getTodayString())
  const [category,    setCategory]    = useState(initialValues?.category ?? '')

  // When categories load async, set initial category if none was selected
  useEffect(() => {
    if (!category && availableCategories.length > 0) {
      setCategory(initialValues?.category ?? availableCategories[0].name)
    }
  }, [availableCategories, category, initialValues?.category])
  // Parse payment method from note prefix when editing (e.g. "[Visa] some note")
  const parsedMethod = (() => {
    const m = initialValues?.note?.match(/^\[(\w+)\]\s?/)
    return m && (PAYMENT_METHODS as readonly string[]).includes(m[1]) ? m[1] : ''
  })()
  const parsedNote = parsedMethod
    ? (initialValues?.note ?? '').replace(/^\[\w+\]\s?/, '')
    : (initialValues?.note ?? '')

  const [note,          setNote]          = useState(parsedNote)
  const [paymentMethod, setPaymentMethod] = useState(parsedMethod)
  const [submitting,    setSubmitting]    = useState(false)
  const [success,       setSuccess]       = useState(false)

  // Detectar cambios sin guardar y propagar al padre
  useEffect(() => {
    if (!onDirtyChange) return
    const isDirty = initialValues
      ? amount !== initialValues.amount ||
        description !== initialValues.description ||
        date !== initialValues.date ||
        category !== initialValues.category ||
        note !== parsedNote ||
        paymentMethod !== parsedMethod
      : amount.length > 0 || description.length > 0 || note.length > 0 || paymentMethod !== ''
    onDirtyChange(isDirty)
  }, [amount, description, date, category, note, paymentMethod, initialValues, parsedNote, parsedMethod, onDirtyChange])

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
        const finalNote = paymentMethod ? `[${paymentMethod}] ${note.trim()}`.trim() : note.trim()
        await onSubmit({ amount: parsedAmount, type, description: description.trim(), date, category, note: finalNote })
      }
      // Mostrar success state breve antes de cerrar
      setSuccess(true)
      onDirtyChange?.(false)
      window.setTimeout(() => onCancel(), 760)
    } catch {
      // El error se muestra desde el padre (toast). Mantener form abierto.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-5">
      {success && (
        <div className="form-success-overlay">
          <div className="success-checkmark">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="success-text">
            {initialValues
              ? 'Cambios guardados'
              : isRecurring
                ? 'Recurrente creado'
                : isExpense ? 'Gasto registrado' : 'Ingreso registrado'}
          </p>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
          Cantidad
        </label>
        <div
          className="relative rounded-2xl"
          style={{
            background: 'var(--color-card)',
            border: '2px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color var(--duration-base) var(--ease-default), box-shadow var(--duration-base) var(--ease-default)',
          }}
        >
          <span
            className={`absolute left-5 top-1/2 -translate-y-1/2 text-2xl pointer-events-none ${accentColor}`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
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
            className="w-full rounded-2xl bg-transparent pl-11 pr-5 py-4 text-3xl text-text text-right focus:outline-none border-none tabular-nums"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--letter-spacing-display)' }}
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
          <div className="flex flex-wrap gap-2">
            {[64, 92, 76, 110, 80].map((w, i) => (
              <Skeleton key={i} width={w} height={28} rounded="full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableCategories.map(cat => {
              const isSelected = category === cat.name
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`pill-bounce px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer ${
                    isSelected
                      ? `${accentBg} text-white shadow-sm pill-active`
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
        <DateInput
          value={date}
          onChange={setDate}
          required
          ariaLabel="Fecha de la transacción"
          className="w-full"
        />
      </div>

      {/* Payment method — income only */}
      {!isExpense && (
        <div>
          <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
            Método de pago
          </label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map(method => {
              const isSelected = paymentMethod === method
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(isSelected ? '' : method)}
                  className={`pill-bounce px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer ${
                    isSelected
                      ? 'bg-income text-white shadow-sm pill-active'
                      : 'bg-surface border border-border text-subtext hover:border-brand/40 hover:text-text'
                  }`}
                >
                  {method}
                </button>
              )
            })}
          </div>
        </div>
      )}

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
              className={`toggle-switch relative w-10 h-5 rounded-full cursor-pointer ${isRecurring ? 'bg-brand toggle-on' : 'bg-border'}`}
            >
              <span
                className={`toggle-thumb absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow ${isRecurring ? 'toggle-thumb-on' : ''}`}
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
                    className={`pill-bounce px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer ${
                      frequency === opt.value
                        ? `${accentBg} text-white shadow-sm pill-active`
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
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface border border-border hover:bg-border hover:text-text transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || !amount || !date}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-2 ${accentBg} ${accentHover} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {submitting && (
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          {submitting
            ? 'Guardando…'
            : isRecurring
              ? 'Crear recurrente'
              : initialValues
                ? 'Guardar cambios'
                : isExpense ? 'Registrar gasto' : 'Registrar ingreso'
          }
        </button>
      </div>
    </form>
  )
}
