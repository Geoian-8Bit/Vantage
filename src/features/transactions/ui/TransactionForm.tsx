'use client'

import { useEffect, useMemo, useState } from 'react'

import { DateInput } from '@/components/ui/DateInput'
import { getTodayString, formatCurrency } from '@/lib/utils/format'
import { resolveSavingsColor } from '@/lib/utils/savingsColors'

import { useCategories } from '@/features/categories/ui/useCategories'
import { useSavings } from '@/features/savings/ui/useSavings'
import { useTransactions } from '@/features/transactions/ui/useTransactions'
import type {
  CreateRecurringInput,
  RecurringFrequency,
} from '@/features/recurring/domain/recurring.schema'

import type { CreateTransactionInput, TxType } from '../domain/transaction.schema'

interface InitialValues {
  amount: string
  description: string
  date: string
  category: string
  note?: string
  savingsAccountId?: string | null
}

interface TransactionFormProps {
  type: TxType
  onSubmit: (data: CreateTransactionInput) => Promise<void>
  onCancel: () => void
  initialValues?: InitialValues
  onDirtyChange?: (dirty: boolean) => void
  /** Si está fijado, la transacción se vincula a este apartado y se omite el cambio de tipo. */
  presetSavingsAccountId?: string
  /** Si está fijado, la transacción se vincula a esta deuda (pago extra / cuota manual). */
  presetDebtId?: string
  /** Si el padre lo provee y no estamos editando, aparece el modo "recurrente" como opción del segmented. */
  onSubmitRecurring?: (data: CreateRecurringInput) => Promise<void>
  /** Si true, el modo queda fijado en "apartado" sin posibilidad de cambio. */
  lockSavingsAccount?: boolean
}

type MovementKind = 'puntual' | 'apartado' | 'recurrente'

const SAVINGS_CATEGORY_NAME = 'Ahorro'

const PAYMENT_METHODS = ['Efectivo', 'Visa', 'Transferencia', 'Bizum'] as const

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'annual', label: 'Anual' },
]

export function TransactionForm({
  type,
  onSubmit,
  onCancel,
  initialValues,
  onDirtyChange,
  presetSavingsAccountId,
  presetDebtId,
  onSubmitRecurring,
  lockSavingsAccount,
}: TransactionFormProps) {
  const { categories } = useCategories()
  const { data: savingsAccounts = [] } = useSavings()
  const { data: allTransactions = [] } = useTransactions()

  const isExpense = type === 'expense'
  const accentBg = isExpense ? 'bg-expense' : 'bg-income'
  const accentHover = isExpense ? 'hover:bg-expense-hover' : 'hover:bg-income-hover'
  const accentColor = isExpense ? 'text-expense' : 'text-income'

  // Balances por apartado, derivados del cliente.
  const savingsBalances = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allTransactions) {
      if (!t.savingsAccountId) continue
      const amt = Number(t.amount)
      const current = map.get(t.savingsAccountId) ?? 0
      // expense = aportación (+), income = retirada (−)
      map.set(t.savingsAccountId, current + (t.type === 'expense' ? amt : -amt))
    }
    return map
  }, [allTransactions])

  // Categorías visibles (la categoría implícita "Ahorro" se reserva para modo apartado).
  const availableCategories = useMemo(
    () =>
      categories.filter((c) => c.type === type && c.name !== SAVINGS_CATEGORY_NAME),
    [categories, type]
  )

  // Estado inicial: si hay savingsAccountId preset / initial, arranca en modo apartado.
  const initialSavingsId = presetSavingsAccountId ?? initialValues?.savingsAccountId ?? null
  const initialKind: MovementKind = initialSavingsId ? 'apartado' : 'puntual'

  // Recurrente solo disponible en creación y si el padre lo soporta.
  const canChooseRecurring = !!onSubmitRecurring && !initialValues && !presetSavingsAccountId && !presetDebtId

  const kindOptions = useMemo<{ value: MovementKind; label: string; disabled?: boolean }[]>(
    () => {
      const opts: { value: MovementKind; label: string; disabled?: boolean }[] = [
        { value: 'puntual', label: isExpense ? 'Gasto puntual' : 'Ingreso puntual' },
        { value: 'apartado', label: 'Ahorro' },
      ]
      if (canChooseRecurring) opts.push({ value: 'recurrente', label: 'Recurrente' })
      return opts
    },
    [canChooseRecurring, isExpense]
  )

  const [kind, setKind] = useState<MovementKind>(initialKind)
  const [amount, setAmount] = useState(initialValues?.amount ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [date, setDate] = useState(initialValues?.date ?? getTodayString())
  const [category, setCategory] = useState(
    initialValues?.category ?? availableCategories[0]?.name ?? 'Otros'
  )
  const [savingsAccountId, setSavingsAccountId] = useState<string | null>(initialSavingsId)
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')

  // Sincronizar categoría con apartado al cambiar de modo.
  useEffect(() => {
    if (kind === 'apartado') return
    if (!category && availableCategories.length > 0) {
      setCategory(initialValues?.category ?? availableCategories[0]!.name)
    }
  }, [availableCategories, category, initialValues?.category, kind])

  // Al entrar en modo apartado, preseleccionar el primero disponible.
  useEffect(() => {
    if (kind === 'apartado' && !savingsAccountId && savingsAccounts.length > 0) {
      setSavingsAccountId(savingsAccounts[0]!.id)
    }
    if (kind !== 'apartado' && savingsAccountId && !lockSavingsAccount) {
      setSavingsAccountId(null)
    }
  }, [kind, savingsAccountId, savingsAccounts, lockSavingsAccount])

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
    const initialSav = initialValues?.savingsAccountId ?? null
    const isDirty = initialValues
      ? amount !== initialValues.amount ||
        description !== initialValues.description ||
        date !== initialValues.date ||
        category !== initialValues.category ||
        note !== parsedNote ||
        paymentMethod !== parsedMethod ||
        savingsAccountId !== initialSav
      : amount.length > 0 ||
        description.length > 0 ||
        note.length > 0 ||
        paymentMethod !== '' ||
        kind !== 'puntual'
    onDirtyChange(isDirty)
  }, [
    amount,
    description,
    date,
    category,
    note,
    paymentMethod,
    savingsAccountId,
    kind,
    initialValues,
    parsedNote,
    parsedMethod,
    onDirtyChange,
  ])

  const usingSavings = kind === 'apartado' && !!savingsAccountId
  const isRecurring = kind === 'recurrente'
  const selectedSavingsAccount = usingSavings
    ? savingsAccounts.find((a) => a.id === savingsAccountId) ?? null
    : null
  const selectedSavingsBalance = selectedSavingsAccount
    ? savingsBalances.get(selectedSavingsAccount.id) ?? 0
    : 0

  const parsedAmount = parseFloat(amount)
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0
  const showAmountError = amount.length > 0 && !amountValid

  // En retirada (income vinculado a apartado) no se puede sacar más de lo que hay.
  const exceedsBalance =
    usingSavings &&
    type === 'income' &&
    amountValid &&
    parsedAmount > selectedSavingsBalance + 0.005

  const blockReason = useMemo(() => {
    if (submitting) return null
    if (!amount || !amountValid) return 'Indica una cantidad mayor de 0'
    if (!date) return 'Selecciona una fecha'
    if (kind === 'apartado' && !savingsAccountId) return 'Elige un apartado'
    return null
  }, [submitting, amount, amountValid, date, kind, savingsAccountId])

  const submitDisabled =
    submitting ||
    !amountValid ||
    !date ||
    (kind === 'apartado' && !savingsAccountId) ||
    !!exceedsBalance

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!amountValid || !date) return
    if (exceedsBalance) return
    setSubmitting(true)
    try {
      const finalCategory = usingSavings ? SAVINGS_CATEGORY_NAME : category
      if (isRecurring && onSubmitRecurring) {
        await onSubmitRecurring({
          amount: parsedAmount.toFixed(2),
          type,
          description: description.trim() || (isExpense ? 'Gasto' : 'Ingreso'),
          frequency,
          nextDate: date,
          active: true,
        })
      } else {
        const finalNote = paymentMethod ? `[${paymentMethod}] ${note.trim()}`.trim() : note.trim()
        await onSubmit({
          amount: parsedAmount.toFixed(2),
          type,
          description: description.trim() || (isExpense ? 'Gasto' : 'Ingreso'),
          date,
          category: finalCategory,
          note: finalNote,
          ...(usingSavings ? { savingsAccountId } : {}),
          ...(presetDebtId ? { debtId: presetDebtId } : {}),
        })
      }
      setSuccess(true)
      onDirtyChange?.(false)
      window.setTimeout(() => onCancel(), 760)
    } catch {
      // El padre muestra el toast
    } finally {
      setSubmitting(false)
    }
  }

  const showKindSelector = !initialValues && !presetDebtId && (kindOptions.length > 1 || !!lockSavingsAccount)
  const dateLabel = isRecurring ? 'Empieza el' : 'Fecha'
  const savingsAccent = selectedSavingsAccount
    ? resolveSavingsColor(selectedSavingsAccount.color)
    : null

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
              : isRecurring
                ? 'Recurrente creado'
                : usingSavings
                  ? isExpense
                    ? 'Aportación registrada'
                    : 'Retirada registrada'
                  : isExpense
                    ? 'Gasto registrado'
                    : 'Ingreso registrado'}
          </p>
        </div>
      )}

      {showKindSelector && (
        <div
          role="radiogroup"
          aria-label="Tipo de movimiento"
          className="flex gap-1 rounded-xl border border-border bg-surface p-1"
        >
          {kindOptions.map((opt) => {
            const isActive = kind === opt.value
            const isDisabled = lockSavingsAccount && opt.value !== 'apartado'
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={isDisabled}
                onClick={() => setKind(opt.value)}
                title={
                  isDisabled
                    ? 'Bloqueado: este movimiento está vinculado al apartado'
                    : undefined
                }
                className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? `${accentBg} text-white shadow-sm`
                    : 'bg-transparent text-subtext hover:text-text'
                }`}
                style={isActive ? { transform: 'translateY(-0.5px)' } : undefined}
              >
                {opt.label}
              </button>
            )
          })}
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
            usingSavings
              ? isExpense
                ? 'Ej: Ahorro para vacaciones'
                : 'Ej: Retirada para hotel'
              : isExpense
                ? 'Ej: Supermercado, Alquiler…'
                : 'Ej: Nómina, Freelance…'
          }
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text"
        />
      </div>

      {kind === 'puntual' && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-subtext">
            Categoría
          </label>
          <div className="flex flex-wrap gap-2">
            {availableCategories.length === 0 ? (
              <p className="text-sm text-subtext italic">
                No hay categorías. Añade una en Ajustes.
              </p>
            ) : (
              availableCategories.map((cat) => {
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
              })
            )}
          </div>
        </div>
      )}

      {kind === 'apartado' && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-subtext">
            Apartado
          </label>
          {savingsAccounts.length === 0 ? (
            <p className="text-sm text-subtext italic">
              No tienes apartados todavía. Crea uno en la pantalla de Ahorros.
            </p>
          ) : lockSavingsAccount && selectedSavingsAccount ? (
            <span
              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-white shadow-sm"
              style={{ background: savingsAccent ?? undefined }}
            >
              {selectedSavingsAccount.name}
              <span className="ml-2 text-xs tabular-nums opacity-80">
                {formatCurrency(selectedSavingsBalance)}
              </span>
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savingsAccounts.map((acc) => {
                const isSelected = savingsAccountId === acc.id
                const accAccent = resolveSavingsColor(acc.color)
                const accBalance = savingsBalances.get(acc.id) ?? 0
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSavingsAccountId(acc.id)}
                    className={`pill-bounce cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ${
                      isSelected
                        ? 'pill-active text-white shadow-sm'
                        : 'border border-border bg-surface text-subtext hover:text-text'
                    }`}
                    style={isSelected ? { background: accAccent } : undefined}
                  >
                    {acc.name}
                    <span className="ml-2 text-xs tabular-nums opacity-80">
                      {formatCurrency(accBalance)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {selectedSavingsAccount && type === 'income' && exceedsBalance && (
            <p className="text-xs font-medium text-error" role="alert">
              Solo puedes retirar hasta{' '}
              <span className="tabular-nums">{formatCurrency(selectedSavingsBalance)}</span>.
            </p>
          )}
          {selectedSavingsAccount && type === 'income' && !exceedsBalance && (
            <p className="text-xs text-subtext">
              Te quedan{' '}
              <span className="font-semibold tabular-nums text-text">
                {formatCurrency(selectedSavingsBalance)}
              </span>{' '}
              en {selectedSavingsAccount.name}.
            </p>
          )}
          {selectedSavingsAccount && type === 'expense' && (
            <p className="text-xs text-subtext">
              Saldo actual de {selectedSavingsAccount.name}:{' '}
              <span className="font-semibold tabular-nums text-text">
                {formatCurrency(selectedSavingsBalance)}
              </span>
            </p>
          )}

          {selectedSavingsAccount && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-subtext">
                Categoría
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: `color-mix(in srgb, ${savingsAccent} 14%, transparent)`,
                  color: savingsAccent ?? undefined,
                }}
                title="Asignada automáticamente al vincular un apartado"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {SAVINGS_CATEGORY_NAME}
              </span>
            </div>
          )}
        </div>
      )}

      {kind === 'recurrente' && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-subtext">
            Frecuencia
          </label>
          <div className="flex flex-wrap gap-2">
            {FREQ_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                className={`pill-bounce cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ${
                  frequency === opt.value
                    ? `${accentBg} pill-active text-white shadow-sm`
                    : 'border border-border bg-surface text-subtext hover:border-brand/40 hover:text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="mt-4">
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
        </div>
      )}

      {!isRecurring && (
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
      )}

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-subtext">
          {dateLabel}
        </label>
        <DateInput
          value={date}
          onChange={setDate}
          required
          ariaLabel={isRecurring ? 'Fecha de inicio de la recurrencia' : 'Fecha de la transacción'}
          className="w-full"
        />
      </div>

      {!isRecurring && (
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
      )}

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
              : isRecurring
                ? 'Crear recurrente'
                : initialValues
                  ? 'Guardar cambios'
                  : usingSavings
                    ? isExpense
                      ? 'Aportar al apartado'
                      : 'Retirar del apartado'
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
