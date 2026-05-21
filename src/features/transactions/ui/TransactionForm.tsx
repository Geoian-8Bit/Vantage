'use client'

import { useEffect, useMemo, useState } from 'react'

import { DateInput } from '@/components/ui/DateInput'
import { getTodayString } from '@/lib/utils/format'

import { useCategories } from '@/features/categories/ui/useCategories'

import type { CreateTransactionInput, TxType } from '../domain/transaction.schema'

interface InitialValues {
  amount: string
  description: string
  date: string
  category: string
  note?: string
}

interface TransactionFormProps {
  type: TxType
  onSubmit: (data: CreateTransactionInput) => Promise<void>
  onCancel: () => void
  initialValues?: InitialValues
  onDirtyChange?: (dirty: boolean) => void
}

const PAYMENT_METHODS = ['Efectivo', 'Visa', 'Transferencia', 'Bizum'] as const

export function TransactionForm({
  type,
  onSubmit,
  onCancel,
  initialValues,
  onDirtyChange,
}: TransactionFormProps) {
  const { categories } = useCategories()

  const isExpense = type === 'expense'
  const accentBg = isExpense ? 'bg-expense' : 'bg-income'
  const accentHover = isExpense ? 'hover:bg-expense-hover' : 'hover:bg-income-hover'
  const accentColor = isExpense ? 'text-expense' : 'text-income'

  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  )

  const [amount, setAmount] = useState(initialValues?.amount ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [date, setDate] = useState(initialValues?.date ?? getTodayString())
  const [category, setCategory] = useState(
    initialValues?.category ?? availableCategories[0]?.name ?? 'Otros'
  )

  const parsedMethod = (() => {
    const m = initialValues?.note?.match(/^\[(\w+)\]\s?/)
    return m && (PAYMENT_METHODS as readonly string[]).includes(m[1]!) ? m[1] : ''
  })()
  const parsedNote = parsedMethod
    ? (initialValues?.note ?? '').replace(/^\[\w+\]\s?/, '')
    : (initialValues?.note ?? '')

  const [note, setNote] = useState(parsedNote)
  const [paymentMethod, setPaymentMethod] = useState(parsedMethod ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showDetails, setShowDetails] = useState(parsedNote.length > 0)

  useEffect(() => {
    if (!onDirtyChange) return
    const isDirty = initialValues
      ? amount !== initialValues.amount ||
        description !== initialValues.description ||
        date !== initialValues.date ||
        category !== initialValues.category ||
        note !== parsedNote ||
        paymentMethod !== parsedMethod
      : amount.length > 0 ||
        description.length > 0 ||
        note.length > 0 ||
        paymentMethod !== ''
    onDirtyChange(isDirty)
  }, [
    amount,
    description,
    date,
    category,
    note,
    paymentMethod,
    initialValues,
    parsedNote,
    parsedMethod,
    onDirtyChange,
  ])

  const parsedAmount = parseFloat(amount)
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0
  const showAmountError = amount.length > 0 && !amountValid

  const blockReason = useMemo(() => {
    if (submitting) return null
    if (!amount || !amountValid) return 'Indica una cantidad mayor de 0'
    if (!date) return 'Selecciona una fecha'
    return null
  }, [submitting, amount, amountValid, date])

  const submitDisabled = submitting || !amountValid || !date

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!amountValid || !date) return
    setSubmitting(true)
    try {
      const finalNote = paymentMethod ? `[${paymentMethod}] ${note.trim()}`.trim() : note.trim()
      await onSubmit({
        amount: parsedAmount.toFixed(2),
        type,
        description: description.trim() || (isExpense ? 'Gasto' : 'Ingreso'),
        date,
        category,
        note: finalNote,
      })
      setSuccess(true)
      onDirtyChange?.(false)
      window.setTimeout(() => onCancel(), 760)
    } catch {
      // El padre muestra el toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-5">
      {success && (
        <div className="form-success-overlay">
          <div className="success-checkmark">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="success-text">
            {initialValues
              ? 'Cambios guardados'
              : isExpense
                ? 'Gasto registrado'
                : 'Ingreso registrado'}
          </p>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-text">Cantidad</label>
        <div
          className="relative rounded-2xl"
          style={{
            background: 'var(--color-card)',
            border: `2px solid ${showAmountError ? 'var(--color-error)' : 'var(--color-border)'}`,
            boxShadow: showAmountError
              ? '0 0 0 4px var(--color-error-light)'
              : 'var(--shadow-sm)',
            transition:
              'border-color var(--duration-base) var(--ease-default), box-shadow var(--duration-base) var(--ease-default)',
          }}
        >
          <span
            className={`pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl ${
              showAmountError ? 'text-error' : accentColor
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            €
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            required
            autoFocus
            aria-invalid={showAmountError || undefined}
            className="w-full rounded-2xl border-none bg-transparent py-4 pl-11 pr-5 text-right text-3xl tabular-nums text-text focus:outline-none"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: 'var(--letter-spacing-display)',
            }}
          />
        </div>
        {showAmountError && (
          <p className="mt-1.5 text-xs text-error" role="alert">
            Indica una cantidad mayor de 0.
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-text">Descripción</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            isExpense ? 'Ej: Supermercado, Alquiler…' : 'Ej: Nómina, Freelance…'
          }
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-subtext">
          Categoría
        </label>
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((cat) => {
            const isSelected = category === cat.name
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.name)}
                className={`pill-bounce cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ${
                  isSelected
                    ? `${accentBg} pill-active text-white shadow-sm`
                    : 'border border-border bg-surface text-subtext hover:border-brand/40 hover:text-text'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-subtext">
          Método de pago{' '}
          <span className="font-normal normal-case text-subtext/60">(opcional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = paymentMethod === method
            return (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(isSelected ? '' : method)}
                className={`pill-bounce cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ${
                  isSelected
                    ? `${accentBg} pill-active text-white shadow-sm`
                    : 'border border-border bg-surface text-subtext hover:border-brand/40 hover:text-text'
                }`}
              >
                {method}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-subtext">
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

      <div className="border-t border-border/40 pt-3">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-subtext transition-colors hover:text-text"
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: showDetails ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform var(--duration-base) var(--ease-spring)',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {showDetails ? 'Ocultar detalles' : 'Añadir nota'}
        </button>

        {showDetails && (
          <div className="mt-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Comentario, recordatorio, contexto…"
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text"
            />
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-subtext transition-colors hover:bg-border hover:text-text"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitDisabled}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${accentBg} ${accentHover} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {submitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {submitting
              ? 'Guardando…'
              : initialValues
                ? 'Guardar cambios'
                : isExpense
                  ? 'Registrar gasto'
                  : 'Registrar ingreso'}
          </button>
        </div>
        {blockReason && (
          <p className="text-center text-xs text-subtext" role="status">
            {blockReason}
          </p>
        )}
      </div>
    </form>
  )
}
