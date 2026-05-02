import { useState, useEffect, useMemo } from 'react'
import type { CreateTransactionDTO, CreateRecurringTemplateDTO, RecurringFrequency } from '../../shared/types'
import { SAVINGS_CATEGORY_NAME } from '../../shared/types'
import { useCategories } from '../hooks/useCategories'
import { useSavings } from '../hooks/useSavings'
import { getTodayString, formatCurrency } from '../lib/utils'
import { resolveSavingsColor } from '../lib/savingsColors'
import { DateInput } from './DateInput'
import { Skeleton } from './Skeleton'

interface TransactionFormProps {
  type: 'expense' | 'income'
  onSubmit: (data: CreateTransactionDTO) => Promise<void>
  onCancel: () => void
  initialValues?: { amount: string; description: string; date: string; category: string; note?: string; savings_account_id?: string | null }
  /** If provided, a "Recurrente" option appears in the kind selector (create mode only) */
  onSubmitRecurring?: (dto: CreateRecurringTemplateDTO) => Promise<void>
  /** Callback que recibe true cuando el form tiene cambios sin guardar */
  onDirtyChange?: (dirty: boolean) => void
  /** Si se indica, se preselecciona el apartado y se fija el tipo a "apartado" */
  presetSavingsAccountId?: string
  /** Si true, el tipo queda fijado en "apartado" sin posibilidad de cambio */
  lockSavingsAccount?: boolean
}

type MovementKind = 'puntual' | 'apartado' | 'recurrente'

const PAYMENT_METHODS = ['Efectivo', 'Visa', 'Transferencia', 'Bizum'] as const

const FREQ_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly',    label: 'Semanal'     },
  { value: 'monthly',   label: 'Mensual'     },
  { value: 'quarterly', label: 'Trimestral'  },
  { value: 'annual',    label: 'Anual'       },
]

export function TransactionForm({
  type,
  onSubmit,
  onCancel,
  initialValues,
  onSubmitRecurring,
  onDirtyChange,
  presetSavingsAccountId,
  lockSavingsAccount,
}: TransactionFormProps) {
  const { categories, loading: catsLoading } = useCategories()
  const { accounts: savingsAccounts, loading: savingsLoading } = useSavings()

  const isExpense   = type === 'expense'
  const accentColor = isExpense ? 'text-expense' : 'text-income'
  const accentBg    = isExpense ? 'bg-expense'   : 'bg-income'
  const accentHover = isExpense ? 'hover:bg-expense-hover' : 'hover:bg-income-hover'

  // El tipo es la decisión arquitectónica: condiciona qué campos aparecen.
  // Se infiere del estado inicial en edición / preset; en creación es 'puntual' por defecto.
  const initialSavingsId = presetSavingsAccountId ?? initialValues?.savings_account_id ?? null
  const initialKind: MovementKind = initialSavingsId ? 'apartado' : 'puntual'
  const [kind, setKind] = useState<MovementKind>(initialKind)

  // Recurrente solo se ofrece como tipo en modo creación (templates) y si el padre
  // lo soporta (onSubmitRecurring presente). En edición de un movimiento normal
  // no se puede cambiar el tipo a recurrente.
  const canChooseRecurring = !!onSubmitRecurring && !initialValues

  // Disponibles para el segmented control: 'apartado' siempre disponible,
  // 'recurrente' solo si el padre lo soporta y no estamos editando.
  const kindOptions = useMemo<{ value: MovementKind; label: string; hint?: string }[]>(() => {
    const opts: { value: MovementKind; label: string; hint?: string }[] = [
      { value: 'puntual',  label: isExpense ? 'Gasto puntual' : 'Ingreso puntual' },
      { value: 'apartado', label: 'Ahorro' },
    ]
    if (canChooseRecurring) {
      opts.push({ value: 'recurrente', label: 'Recurrente' })
    }
    return opts
  }, [canChooseRecurring, isExpense])

  const [amount,           setAmount]           = useState(initialValues?.amount ?? '')
  const [description,      setDescription]      = useState(initialValues?.description ?? '')
  const [date,             setDate]             = useState(initialValues?.date ?? getTodayString())
  const [category,         setCategory]         = useState(initialValues?.category ?? '')
  const [savingsAccountId, setSavingsAccountId] = useState<string | null>(initialSavingsId)
  const [frequency,        setFrequency]        = useState<RecurringFrequency>('monthly')

  // Las categorías "Ahorro" se excluyen del selector porque el tipo "apartado"
  // se encarga de fijarla automáticamente.
  const availableCategories = categories.filter(
    c => c.type === type && c.name !== SAVINGS_CATEGORY_NAME
  )

  // Set initial category when categories load (solo si no hay apartado activo)
  useEffect(() => {
    if (kind === 'apartado') return
    if (!category && availableCategories.length > 0) {
      setCategory(initialValues?.category ?? availableCategories[0].name)
    }
  }, [availableCategories, category, initialValues?.category, kind])

  // Al pasar a 'apartado', preseleccionar el primer apartado disponible
  useEffect(() => {
    if (kind === 'apartado' && !savingsAccountId && savingsAccounts.length > 0) {
      setSavingsAccountId(savingsAccounts[0].id)
    }
    if (kind !== 'apartado' && savingsAccountId && !lockSavingsAccount) {
      setSavingsAccountId(null)
    }
  }, [kind, savingsAccountId, savingsAccounts, lockSavingsAccount])

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
  // Disclosure de "Detalles" — abierto si ya hay nota al editar
  const [showDetails,   setShowDetails]   = useState<boolean>(parsedNote.length > 0)

  // Detectar cambios sin guardar y propagar al padre
  useEffect(() => {
    if (!onDirtyChange) return
    const initialSav = initialValues?.savings_account_id ?? null
    const isDirty = initialValues
      ? amount !== initialValues.amount ||
        description !== initialValues.description ||
        date !== initialValues.date ||
        category !== initialValues.category ||
        note !== parsedNote ||
        paymentMethod !== parsedMethod ||
        savingsAccountId !== initialSav
      : amount.length > 0 || description.length > 0 || note.length > 0 || paymentMethod !== '' || kind !== 'puntual'
    onDirtyChange(isDirty)
  }, [amount, description, date, category, note, paymentMethod, savingsAccountId, kind, initialValues, parsedNote, parsedMethod, onDirtyChange])

  const usingSavings = kind === 'apartado' && !!savingsAccountId
  const isRecurring  = kind === 'recurrente'
  const selectedSavingsAccount = usingSavings
    ? savingsAccounts.find(a => a.id === savingsAccountId) ?? null
    : null

  const parsedAmount = parseFloat(amount)
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0
  const exceedsBalance =
    usingSavings && type === 'income' && selectedSavingsAccount &&
    amountValid && parsedAmount > selectedSavingsAccount.balance + 0.005

  // Razón visible bajo el botón cuando el submit está deshabilitado
  const blockReason = useMemo(() => {
    if (submitting) return null
    if (!amount || !amountValid) return 'Indica una cantidad mayor de 0'
    if (!date) return 'Selecciona una fecha'
    if (kind === 'apartado' && !savingsAccountId) return 'Elige un apartado'
    if (exceedsBalance) return null // ya hay un mensaje específico bajo el selector
    return null
  }, [submitting, amount, amountValid, date, kind, savingsAccountId, exceedsBalance])

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
          amount:      parsedAmount,
          type,
          description: description.trim(),
          category:    finalCategory,
          frequency,
          start_date:  date,
        })
      } else {
        const finalNote = paymentMethod ? `[${paymentMethod}] ${note.trim()}`.trim() : note.trim()
        await onSubmit({
          amount: parsedAmount,
          type,
          description: description.trim(),
          date,
          category: finalCategory,
          note: finalNote,
          savings_account_id: usingSavings ? savingsAccountId : null,
        })
      }
      setSuccess(true)
      onDirtyChange?.(false)
      window.setTimeout(() => onCancel(), 760)
    } catch {
      // El error se muestra desde el padre (toast). Mantener form abierto.
    } finally {
      setSubmitting(false)
    }
  }

  const showKindSelector = !initialValues && (kindOptions.length > 1 || lockSavingsAccount)
  const dateLabel = isRecurring ? 'Empieza el' : 'Fecha'
  const savingsAccent = selectedSavingsAccount ? resolveSavingsColor(selectedSavingsAccount.color) : null

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
                : usingSavings
                  ? (isExpense ? 'Aportación registrada' : 'Retirada registrada')
                  : isExpense ? 'Gasto registrado' : 'Ingreso registrado'}
          </p>
        </div>
      )}

      {/* Tipo de movimiento — segmented control, decide la arquitectura del form */}
      {showKindSelector && (
        <div role="radiogroup" aria-label="Tipo de movimiento" className="flex gap-1 p-1 bg-surface rounded-xl border border-border">
          {kindOptions.map(opt => {
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
                title={isDisabled ? 'Bloqueado: este movimiento está vinculado al apartado' : undefined}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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

      {/* Amount — campo primario */}
      <div>
        <label className="block text-sm font-semibold text-text mb-2">
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

      {/* Description — campo primario */}
      <div>
        <label className="block text-sm font-semibold text-text mb-2">
          Descripción
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={
            usingSavings
              ? (isExpense ? 'Ej: Ahorro para vacaciones' : 'Ej: Retirada para hotel')
              : isExpense ? 'Ej: Supermercado, Alquiler…' : 'Ej: Nómina, Freelance…'
          }
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Categoría / Apartado / Frecuencia — la sección cambia según kind */}
      {kind === 'puntual' && (
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
      )}

      {kind === 'apartado' && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-subtext uppercase tracking-wider">
            Apartado
          </label>
          {savingsLoading ? (
            <Skeleton width={180} height={32} rounded="md" />
          ) : savingsAccounts.length === 0 ? (
            <p className="text-sm text-subtext italic">
              No tienes apartados todavía. Crea uno en la pantalla de Ahorros.
            </p>
          ) : lockSavingsAccount && selectedSavingsAccount ? (
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm"
              style={{ background: savingsAccent ?? undefined }}
            >
              {selectedSavingsAccount.name}
              <span className="ml-2 text-xs opacity-80 tabular-nums">
                {formatCurrency(selectedSavingsAccount.balance)}
              </span>
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savingsAccounts.map(acc => {
                const isSelected = savingsAccountId === acc.id
                const accAccent = resolveSavingsColor(acc.color)
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSavingsAccountId(acc.id)}
                    className={`pill-bounce px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer ${
                      isSelected ? 'text-white shadow-sm pill-active' : 'bg-surface border border-border text-subtext hover:text-text'
                    }`}
                    style={isSelected ? { background: accAccent } : undefined}
                  >
                    {acc.name}
                    <span className="ml-2 text-xs opacity-80 tabular-nums">
                      {formatCurrency(acc.balance)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Estado contextual del apartado seleccionado */}
          {selectedSavingsAccount && type === 'income' && exceedsBalance && (
            <p className="text-xs text-error font-medium" role="alert">
              Solo puedes retirar hasta <span className="tabular-nums">{formatCurrency(selectedSavingsAccount.balance)}</span>.
            </p>
          )}
          {selectedSavingsAccount && type === 'income' && !exceedsBalance && (
            <p className="text-xs text-subtext">
              Te quedan <span className="tabular-nums font-semibold text-text">{formatCurrency(selectedSavingsAccount.balance)}</span> en {selectedSavingsAccount.name}.
            </p>
          )}
          {selectedSavingsAccount && type === 'expense' && (
            <p className="text-xs text-subtext">
              Saldo actual de {selectedSavingsAccount.name}: <span className="tabular-nums font-semibold text-text">{formatCurrency(selectedSavingsAccount.balance)}</span>
            </p>
          )}

          {/* Categoría implícita — usa el color del apartado seleccionado */}
          {selectedSavingsAccount && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-subtext uppercase tracking-wider">Categoría</span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: `color-mix(in srgb, ${savingsAccent} 14%, transparent)`,
                  color: savingsAccent ?? undefined,
                }}
                title="Asignada automáticamente al vincular un apartado"
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
          <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
            Frecuencia
          </label>
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
          {/* En recurrente también necesitas categoría */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
              Categoría
            </label>
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
            </div>
          </div>
        </div>
      )}

      {/* Método de pago — ahora aplica a ambos tipos. Se oculta solo en recurrente */}
      {!isRecurring && (
        <div>
          <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
            Método de pago <span className="normal-case font-normal text-subtext/60">(opcional)</span>
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
                      ? `${accentBg} text-white shadow-sm pill-active`
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

      {/* Fecha — compacta. En recurrente cambia el label a "Empieza el" */}
      <div>
        <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
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

      {/* Detalles — disclosure con la nota dentro */}
      <div className="border-t border-border/40 pt-3">
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          aria-expanded={showDetails}
          className="flex items-center gap-1.5 text-xs font-semibold text-subtext hover:text-text transition-colors cursor-pointer"
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
              onChange={e => setNote(e.target.value)}
              placeholder="Comentario, recordatorio, contexto…"
              rows={2}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface border border-border hover:bg-border hover:text-text transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitDisabled}
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
                  : usingSavings
                    ? (isExpense ? 'Aportar al apartado' : 'Retirar del apartado')
                    : isExpense ? 'Registrar gasto' : 'Registrar ingreso'
            }
          </button>
        </div>
        {blockReason && (
          <p className="text-xs text-subtext text-center" role="status">
            {blockReason}
          </p>
        )}
      </div>
    </form>
  )
}
