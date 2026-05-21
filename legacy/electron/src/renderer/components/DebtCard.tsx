import type { Debt } from '../../shared/types'
import { formatCurrency } from '../lib/utils'
import { resolveSavingsColor } from '../lib/savingsColors'
import { prettyMonth, addMonths } from '../lib/debtMath'
import { TiltCard } from './TiltCard'

interface DebtCardProps {
  debt: Debt
  onEdit: () => void
  onDelete: () => void
  onExtraPayment: () => void
}

export function DebtCard({ debt, onEdit, onDelete, onExtraPayment }: DebtCardProps) {
  const accent = resolveSavingsColor(debt.color)
  const progress = debt.initial_amount > 0
    ? Math.min(100, Math.max(0, (debt.paid / debt.initial_amount) * 100))
    : 0
  const isPaid = debt.archived_at != null
  const canDelete = isPaid || debt.paid < 0.005

  // Estimación de fecha de fin: hoy + months_remaining (o archivado_at si saldada)
  const today = new Date().toISOString().slice(0, 10)
  const estimatedEnd = isPaid
    ? debt.archived_at!
    : addMonths(today, Math.max(0, debt.months_remaining - 1))

  return (
    <TiltCard
      intensity={2}
      className={`relative card-anim rounded-2xl bg-card border shadow-sm p-5 min-w-0 flex flex-col gap-4 overflow-hidden transition-shadow ${isPaid ? 'savings-goal-reached' : 'border-border'}`}
      style={
        isPaid
          ? ({
              borderColor: `color-mix(in srgb, var(--color-income) 55%, transparent)`,
              boxShadow: `0 0 0 1px color-mix(in srgb, var(--color-income) 35%, transparent), 0 8px 28px color-mix(in srgb, var(--color-income) 22%, transparent)`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* Tira de color superior */}
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: isPaid ? 'var(--color-income)' : accent }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
              color: accent,
            }}
          >
            {/* Icono de "factura/recibo" */}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 2 2 2-2 2 2 2-2 3 2V8z" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="13" y2="17" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text truncate" title={debt.name}>
              {debt.name}
            </p>
            <p className="text-[11px] text-subtext truncate">
              {debt.creditor ? `A: ${debt.creditor}` : 'Sin acreedor'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isPaid && (
            <button
              onClick={onEdit}
              aria-label={`Editar ${debt.name}`}
              title="Editar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-subtext bg-surface/60 hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={!canDelete}
            aria-label={`Eliminar ${debt.name}`}
            title={canDelete ? 'Eliminar' : 'Aún hay pagos: salda la deuda primero'}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-subtext bg-surface/60 hover:bg-expense-light hover:text-expense transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface/60 disabled:hover:text-subtext"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cantidades */}
      <div>
        <p className="text-[11px] font-semibold text-subtext uppercase tracking-wider mb-0.5">
          {isPaid ? 'Saldada' : 'Capital pendiente'}
        </p>
        <p
          className="font-bold tabular-nums truncate"
          style={{
            fontSize: 'clamp(1.25rem, 2.4vw, 1.75rem)',
            fontFamily: 'var(--font-display)',
            letterSpacing: 'var(--letter-spacing-display)',
            color: isPaid ? 'var(--color-income)' : accent,
          }}
          title={formatCurrency(isPaid ? 0 : debt.pending)}
        >
          {formatCurrency(isPaid ? 0 : debt.pending)}
        </p>
        <p className="text-[11px] text-subtext mt-1 tabular-nums">
          {formatCurrency(debt.paid)} pagados de {formatCurrency(debt.initial_amount)}
        </p>
      </div>

      {/* Estado: saldada vs barra de progreso + meta */}
      {isPaid ? (
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{
            background: `color-mix(in srgb, var(--color-income) 14%, transparent)`,
            border: `1px solid color-mix(in srgb, var(--color-income) 35%, transparent)`,
          }}
        >
          <span
            aria-hidden="true"
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 savings-goal-check"
            style={{ background: 'var(--color-income)', color: 'white' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight text-income">
              Deuda saldada
            </p>
            {debt.archived_at && (
              <p className="text-[11px] text-subtext leading-tight">
                Cerrada en {prettyMonth(debt.archived_at)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between text-[11px] mb-1.5">
              <span className="text-subtext">{progress.toFixed(0)}% pagado</span>
              <span className="font-semibold tabular-nums text-subtext">
                {debt.months_remaining > 0 ? `~${debt.months_remaining} ${debt.months_remaining === 1 ? 'mes' : 'meses'}` : 'Pendiente final'}
              </span>
            </div>
            <div
              className="relative h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--color-surface)' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, white) 100%)`,
                  transition: 'width var(--duration-slow) var(--ease-spring)',
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-subtext">Cuota: <span className="font-semibold text-text">{formatCurrency(debt.monthly_amount)}/mes</span></span>
            <span className="text-subtext">Fin estim.: <span className="font-semibold text-text">{prettyMonth(estimatedEnd)}</span></span>
          </div>
        </>
      )}

      {/* Acciones */}
      {!isPaid && (
        <div className="flex gap-2 mt-auto">
          <button
            onClick={onExtraPayment}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            style={{ background: accent }}
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Pago extra
          </button>
        </div>
      )}
    </TiltCard>
  )
}
