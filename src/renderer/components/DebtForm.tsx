import { useState, useEffect, useMemo, useRef } from 'react'
import type {
  Debt,
  CreateDebtDTO,
  UpdateDebtDTO,
} from '../../shared/types'
import { formatCurrency, getTodayString } from '../lib/utils'
import { SAVINGS_SLOTS, SAVINGS_SLOT_LABELS, resolveSavingsColor } from '../lib/savingsColors'
import {
  monthsForQuota,
  quotaForMonths,
  scenarios,
  prettyMonth,
  addMonths,
} from '../lib/debtMath'
import { DateInput } from './DateInput'

interface DebtFormProps {
  initial?: Debt
  onSubmit: (data: CreateDebtDTO | UpdateDebtDTO) => Promise<void>
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}

type DefineMode = 'quota' | 'months'

const DEFAULT_SLOT = SAVINGS_SLOTS[0]
const DEFAULT_MONTHS = 12

export function DebtForm({ initial, onSubmit, onCancel, onDirtyChange }: DebtFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [creditor, setCreditor] = useState(initial?.creditor ?? '')
  const [color, setColor] = useState<string | null>(initial?.color ?? DEFAULT_SLOT)
  const [capital, setCapital] = useState<string>(initial?.initial_amount != null ? String(initial.initial_amount) : '')
  const [startDate, setStartDate] = useState<string>(initial?.start_date ?? getTodayString())
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const [mode, setMode] = useState<DefineMode>('quota')
  const [quotaInput, setQuotaInput] = useState<string>(initial?.monthly_amount != null ? String(initial.monthly_amount) : '')
  const [monthsInput, setMonthsInput] = useState<string>(
    initial && initial.monthly_amount > 0
      ? String(Math.ceil(initial.initial_amount / initial.monthly_amount))
      : String(DEFAULT_MONTHS)
  )
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const capitalInputRef = useRef<HTMLInputElement>(null)
  const quotaInputRef = useRef<HTMLInputElement>(null)

  // ── Cálculos en vivo ─────────────────────────────────────────────────────
  const capitalNum = useMemo(() => {
    const n = parseFloat(capital)
    return isFinite(n) && n > 0 ? n : 0
  }, [capital])

  const computed = useMemo(() => {
    if (capitalNum <= 0) return null
    if (mode === 'quota') {
      const q = parseFloat(quotaInput)
      if (!isFinite(q) || q <= 0) return null
      try {
        const m = monthsForQuota(capitalNum, q)
        return { quota: q, months: m, endDate: addMonths(startDate, Math.max(0, m - 1)) }
      } catch {
        return null
      }
    }
    const ms = parseInt(monthsInput, 10)
    if (!isFinite(ms) || ms <= 0) return null
    try {
      const q = quotaForMonths(capitalNum, ms)
      return { quota: q, months: ms, endDate: addMonths(startDate, Math.max(0, ms - 1)) }
    } catch {
      return null
    }
  }, [capitalNum, mode, quotaInput, monthsInput, startDate])

  const altScenarios = useMemo(() => {
    if (capitalNum <= 0) return []
    try {
      // Excluir el plazo actualmente seleccionado para evitar duplicado
      const currentMonths = computed?.months ?? null
      const list = scenarios(capitalNum, startDate)
      return list.filter(s => s.months !== currentMonths)
    } catch {
      return []
    }
  }, [capitalNum, startDate, computed])

  // ── Dirty tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!onDirtyChange) return
    const initialName = initial?.name ?? ''
    const initialCreditor = initial?.creditor ?? ''
    const initialColor = initial?.color ?? DEFAULT_SLOT
    const initialCapital = initial?.initial_amount != null ? String(initial.initial_amount) : ''
    const initialStart = initial?.start_date ?? getTodayString()
    const initialNotes = initial?.notes ?? ''
    const initialMonthly = initial?.monthly_amount ?? null

    // En modo "cuota fija" comparamos la entrada literal; en modo "plazo"
    // comparamos la cuota calculada con la inicial (con margen de 1 céntimo).
    const monthlyChanged = mode === 'quota'
      ? quotaInput !== (initialMonthly != null ? String(initialMonthly) : '')
      : initialMonthly != null && computed != null
        ? Math.abs(computed.quota - initialMonthly) > 0.005
        : computed != null  // crear + modo plazo: dirty si ya hay un cálculo

    const dirty =
      name !== initialName ||
      (creditor ?? '') !== initialCreditor ||
      color !== initialColor ||
      capital !== initialCapital ||
      startDate !== initialStart ||
      (notes ?? '') !== initialNotes ||
      monthlyChanged
    onDirtyChange(dirty)
  }, [name, creditor, color, capital, startDate, notes, quotaInput, mode, computed, initial, onDirtyChange])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setValidationError(null)

    if (!name.trim()) {
      setValidationError('Indica un nombre para la deuda')
      return
    }
    if (capitalNum <= 0) {
      setValidationError('Indica un capital inicial mayor que 0')
      return
    }
    if (!computed) {
      setValidationError(
        mode === 'quota'
          ? 'Indica una cuota mensual mayor que 0'
          : 'Indica un plazo en meses mayor que 0'
      )
      return
    }
    if (computed.quota > capitalNum) {
      setValidationError('La cuota no puede ser mayor que el capital inicial')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        creditor: creditor.trim() || null,
        color,
        initial_amount: capitalNum,
        monthly_amount: Number(computed.quota.toFixed(2)),
        start_date: startDate,
        notes: notes.trim() || null,
      })
      setSuccess(true)
      onDirtyChange?.(false)
      window.setTimeout(() => onCancel(), 760)
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  const previewAccent = resolveSavingsColor(color)

  return (
    <form onSubmit={handleSubmit} className="relative space-y-5">
      {success && (
        <div className="form-success-overlay">
          <div className="success-checkmark">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="success-text">{initial ? 'Cambios guardados' : 'Deuda creada'}</p>
        </div>
      )}

      {/* Preview en vivo */}
      <div
        className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 overflow-hidden relative"
        aria-label="Previsualización de la deuda"
      >
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: previewAccent, transition: 'background var(--duration-base) var(--ease-default)' }}
        />
        <span
          aria-hidden="true"
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `color-mix(in srgb, ${previewAccent} 18%, transparent)`,
            color: previewAccent,
            transition: 'background var(--duration-base) var(--ease-default), color var(--duration-base) var(--ease-default)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V8z" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text truncate">{name.trim() || 'Mi deuda'}</p>
          <p className="text-[11px] text-subtext truncate">
            {creditor.trim() ? `A: ${creditor.trim()}` : 'Sin acreedor'}
          </p>
        </div>
        {capitalNum > 0 && (
          <p className="font-bold tabular-nums text-sm shrink-0" style={{ color: previewAccent, fontFamily: 'var(--font-display)' }}>
            {formatCurrency(capitalNum)}
          </p>
        )}
      </div>

      {/* Nombre + acreedor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
            Nombre
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Coche, Préstamo Pedro…"
            required
            autoFocus
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
            Acreedor (opcional)
          </label>
          <input
            type="text"
            value={creditor}
            onChange={e => setCreditor(e.target.value)}
            placeholder="Banco, persona, comercio…"
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
      </div>

      {/* Color */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-xs font-semibold text-subtext uppercase tracking-wider">
            Color
          </label>
          <span className="text-[10px] text-subtext/70 italic">
            Se ajusta a la apariencia elegida en Ajustes
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {SAVINGS_SLOTS.map(slot => {
            const isSelected = color === slot
            const cssVar = `var(--${slot})`
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setColor(slot)}
                aria-label={SAVINGS_SLOT_LABELS[slot]}
                aria-pressed={isSelected}
                title={SAVINGS_SLOT_LABELS[slot]}
                className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110"
                style={{
                  background: cssVar,
                  boxShadow: isSelected
                    ? `0 0 0 2px var(--color-card), 0 0 0 4px ${cssVar}, var(--shadow-sm)`
                    : 'var(--shadow-sm)',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform var(--duration-base) var(--ease-spring), box-shadow var(--duration-base) var(--ease-default)',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Capital + fecha de inicio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
            Capital total
          </label>
          <div
            className="relative rounded-xl"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-brand pointer-events-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              €
            </span>
            <input
              ref={capitalInputRef}
              type="number"
              step="0.01"
              min="0.01"
              value={capital}
              onChange={e => setCapital(e.target.value)}
              placeholder="0,00"
              required
              className="w-full rounded-xl bg-transparent pl-9 pr-4 py-2.5 text-sm text-text text-right tabular-nums focus:outline-none border-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
            Primera cuota
          </label>
          <DateInput
            value={startDate}
            onChange={setStartDate}
            ariaLabel="Fecha de la primera cuota"
            className="w-full"
          />
        </div>
      </div>

      {/* Toggle cuota vs plazo */}
      <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <label className="text-xs font-semibold text-subtext uppercase tracking-wider">
            Plan de pago
          </label>
          <div role="tablist" aria-label="Cómo definir el pago" className="inline-flex bg-card border border-border rounded-lg p-0.5">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'quota'}
              onClick={() => setMode('quota')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${mode === 'quota' ? 'bg-brand text-white' : 'text-subtext hover:text-text'}`}
            >
              Cuota fija
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'months'}
              onClick={() => setMode('months')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${mode === 'months' ? 'bg-brand text-white' : 'text-subtext hover:text-text'}`}
            >
              Plazo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          {/* Input de cuota o de meses según modo */}
          {mode === 'quota' ? (
            <div>
              <label className="block text-[10px] text-subtext mb-1.5">Cuota mensual</label>
              <div
                className="relative rounded-xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
              >
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-brand pointer-events-none" style={{ fontFamily: 'var(--font-display)' }}>€</span>
                <input
                  ref={quotaInputRef}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quotaInput}
                  onChange={e => setQuotaInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl bg-transparent pl-9 pr-3 py-2 text-sm text-text text-right tabular-nums focus:outline-none border-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] text-subtext mb-1.5">Plazo en meses</label>
              <div
                className="relative rounded-xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
              >
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={monthsInput}
                  onChange={e => setMonthsInput(e.target.value)}
                  placeholder="12"
                  className="w-full rounded-xl bg-transparent px-4 py-2 text-sm text-text text-right tabular-nums focus:outline-none border-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-subtext pointer-events-none">meses</span>
              </div>
            </div>
          )}

          {/* Resultado calculado del otro lado */}
          <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2">
            <p className="text-[10px] text-subtext mb-0.5">{mode === 'quota' ? 'Plazo estimado' : 'Cuota mensual'}</p>
            <p
              className="font-bold tabular-nums truncate"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: previewAccent }}
            >
              {computed
                ? mode === 'quota'
                  ? `${computed.months} ${computed.months === 1 ? 'mes' : 'meses'}`
                  : formatCurrency(computed.quota)
                : '·'}
            </p>
          </div>
        </div>

        {computed && capitalNum > 0 && (
          <p className="text-[11px] text-subtext leading-relaxed">
            Pagarás <span className="font-semibold text-text tabular-nums">{formatCurrency(computed.quota)}/mes</span> durante <span className="font-semibold text-text">{computed.months} {computed.months === 1 ? 'mes' : 'meses'}</span> · Fin estimado <span className="font-semibold text-text">{prettyMonth(computed.endDate)}</span>.
          </p>
        )}

        {/* Mini-tabla de escenarios alternativos */}
        {altScenarios.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-subtext uppercase tracking-wider mb-1.5">Otras opciones</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {altScenarios.slice(0, 6).map(s => (
                <button
                  key={s.months}
                  type="button"
                  onClick={() => {
                    setMode('months')
                    setMonthsInput(String(s.months))
                  }}
                  className="rounded-lg border border-border bg-card hover:border-brand hover:bg-brand-light transition-colors px-2 py-1.5 text-[11px] cursor-pointer"
                  title={`${s.months} meses · ${formatCurrency(s.quota)}/mes`}
                >
                  <p className="font-semibold text-text leading-tight">{s.months}m</p>
                  <p className="text-subtext tabular-nums leading-tight">{formatCurrency(s.quota)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Añade contexto: motivo, condiciones, recordatorios…"
          rows={2}
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
        />
      </div>

      {validationError && (
        <p className="text-xs text-expense bg-expense-light border border-expense/30 rounded-lg px-3 py-2">
          {validationError}
        </p>
      )}

      {/* Acciones */}
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
          disabled={submitting || !name.trim() || capitalNum <= 0 || !computed}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && (
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear deuda'}
        </button>
      </div>
    </form>
  )
}
