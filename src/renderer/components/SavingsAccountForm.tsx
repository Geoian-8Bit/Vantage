import { useState, useEffect, useRef } from 'react'
import type {
  SavingsAccount,
  CreateSavingsAccountDTO,
  UpdateSavingsAccountDTO,
} from '../../shared/types'
import { formatCurrency } from '../lib/utils'
import { SAVINGS_SLOTS, SAVINGS_SLOT_LABELS, resolveSavingsColor } from '../lib/savingsColors'

interface SavingsAccountFormProps {
  initial?: SavingsAccount
  onSubmit: (data: CreateSavingsAccountDTO | UpdateSavingsAccountDTO) => Promise<void>
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
}

// La paleta se define en globals.css por tema (--savings-1 .. --savings-8).
// El form guarda el slot, no un hex, así los apartados se reajustan al cambiar
// la apariencia desde Ajustes.
const DEFAULT_SLOT = SAVINGS_SLOTS[0]

export function SavingsAccountForm({ initial, onSubmit, onCancel, onDirtyChange }: SavingsAccountFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState<string | null>(initial?.color ?? DEFAULT_SLOT)
  const [hasGoal, setHasGoal] = useState<boolean>(initial?.target_amount != null)
  const [target, setTarget] = useState<string>(
    initial?.target_amount != null ? String(initial.target_amount) : ''
  )
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const targetInputRef = useRef<HTMLInputElement>(null)
  const previousHasGoal = useRef(hasGoal)

  // Foco en el input de meta al activar el toggle
  useEffect(() => {
    if (hasGoal && !previousHasGoal.current) {
      targetInputRef.current?.focus()
    }
    previousHasGoal.current = hasGoal
  }, [hasGoal])

  useEffect(() => {
    if (!onDirtyChange) return
    const initialName = initial?.name ?? ''
    const initialColor = initial?.color ?? DEFAULT_SLOT
    const initialHasGoal = initial?.target_amount != null
    const initialTarget = initial?.target_amount != null ? String(initial.target_amount) : ''
    const dirty =
      name !== initialName ||
      color !== initialColor ||
      hasGoal !== initialHasGoal ||
      target !== initialTarget
    onDirtyChange(dirty)
  }, [name, color, hasGoal, target, initial, onDirtyChange])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!name.trim()) return
    const targetNum = hasGoal ? parseFloat(target) : null
    if (hasGoal && (targetNum == null || isNaN(targetNum) || targetNum <= 0)) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        color,
        target_amount: hasGoal ? targetNum : null,
      })
      setSuccess(true)
      onDirtyChange?.(false)
      window.setTimeout(() => onCancel(), 760)
    } catch {
      // error mostrado vía toast por el padre
    } finally {
      setSubmitting(false)
    }
  }

  const previewAccent = resolveSavingsColor(color)
  const previewName = name.trim() || 'Mi apartado'
  const previewTarget = hasGoal && target ? parseFloat(target) : null

  return (
    <form onSubmit={handleSubmit} className="relative space-y-5">
      {success && (
        <div className="form-success-overlay">
          <div className="success-checkmark">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="success-text">{initial ? 'Cambios guardados' : 'Apartado creado'}</p>
        </div>
      )}

      {/* Preview en vivo */}
      <div
        className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 overflow-hidden relative"
        aria-label="Previsualización del apartado"
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
            <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v2c0 4.4 3.6 8 8 8v2H8v2h8v-2h-3v-2c4.4 0 8-3.6 8-8V7a2 2 0 0 0-2-2z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text truncate">{previewName}</p>
          <p className="text-[11px] text-subtext">
            {previewTarget && previewTarget > 0 ? `Meta: ${formatCurrency(previewTarget)}` : 'Sin meta'}
          </p>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-subtext uppercase tracking-wider mb-2">
          Nombre del apartado
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Vacaciones, Emergencia…"
          required
          autoFocus
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      {/* Color — los slots heredan los colores del tema activo */}
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
                  /* Doble shadow simula ring + offset:
                     - Anillo interno con el color de la card crea el "hueco"
                     - Anillo externo del color elegido cuando está seleccionado */
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

      {/* Meta toggle */}
      <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
        <label className="flex items-center gap-3 select-none">
          <div
            onClick={() => setHasGoal(v => !v)}
            className={`toggle-switch relative w-10 h-5 rounded-full cursor-pointer ${hasGoal ? 'bg-brand toggle-on' : 'bg-border'}`}
          >
            <span
              className={`toggle-thumb absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow ${hasGoal ? 'toggle-thumb-on' : ''}`}
            />
          </div>
          <span className="text-sm font-semibold text-text">Establecer meta de ahorro</span>
        </label>

        {hasGoal && (
          <div>
            <label className="block text-xs text-subtext mb-2">Cantidad objetivo</label>
            <div
              className="relative rounded-xl"
              style={{
                background: 'var(--color-card)',
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
                ref={targetInputRef}
                type="number"
                step="0.01"
                min="0.01"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="0,00"
                required
                className="w-full rounded-xl bg-transparent pl-9 pr-4 py-2.5 text-sm text-text text-right tabular-nums focus:outline-none border-none"
              />
            </div>
          </div>
        )}
      </div>

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
          disabled={submitting || !name.trim() || (hasGoal && !target)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && (
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear apartado'}
        </button>
      </div>
    </form>
  )
}
