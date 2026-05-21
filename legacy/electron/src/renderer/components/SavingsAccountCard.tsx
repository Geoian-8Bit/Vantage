import type { SavingsAccount } from '../../shared/types'
import { formatCurrency } from '../lib/utils'
import { resolveSavingsColor } from '../lib/savingsColors'
import { TiltCard } from './TiltCard'

interface SavingsAccountCardProps {
  account: SavingsAccount
  onEdit: () => void
  onDelete: () => void
  onDeposit: () => void
  onWithdraw: () => void
}

export function SavingsAccountCard({
  account,
  onEdit,
  onDelete,
  onDeposit,
  onWithdraw,
}: SavingsAccountCardProps) {
  const accent = resolveSavingsColor(account.color)
  const hasGoal = account.target_amount != null && account.target_amount > 0
  const rawProgress = hasGoal ? (account.balance / account.target_amount!) * 100 : 0
  const progress = hasGoal ? Math.min(100, Math.max(0, rawProgress)) : 0
  const goalReached = hasGoal && account.balance >= account.target_amount!
  const overage = goalReached ? account.balance - account.target_amount! : 0
  const hasBalance = Math.abs(account.balance) > 0.005
  const isEmpty = !hasBalance

  return (
    <TiltCard
      intensity={2}
      className={`relative card-anim rounded-2xl bg-card border shadow-sm p-5 min-w-0 flex flex-col gap-4 overflow-hidden transition-shadow ${goalReached ? 'savings-goal-reached' : 'border-border'}`}
      style={
        goalReached
          ? ({
              borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`,
              boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 35%, transparent), 0 8px 28px color-mix(in srgb, ${accent} 22%, transparent)`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* Tira de color superior */}
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: accent }}
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
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v2c0 4.4 3.6 8 8 8v2H8v2h8v-2h-3v-2c4.4 0 8-3.6 8-8V7a2 2 0 0 0-2-2z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text truncate" title={account.name}>
              {account.name}
            </p>
            <p className="text-[11px] text-subtext">
              {hasGoal ? `Meta: ${formatCurrency(account.target_amount!)}` : 'Sin meta'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            aria-label={`Editar ${account.name}`}
            title="Editar"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-subtext bg-surface/60 hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            disabled={hasBalance}
            aria-label={`Eliminar ${account.name}`}
            title={hasBalance ? 'Retira el saldo primero para poder eliminar' : 'Eliminar'}
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

      {/* Saldo */}
      <div>
        <p className="text-[11px] font-semibold text-subtext uppercase tracking-wider mb-0.5">
          Saldo acumulado
        </p>
        <p
          className="font-bold text-text tabular-nums truncate"
          style={{
            fontSize: 'clamp(1.25rem, 2.4vw, 1.75rem)',
            fontFamily: 'var(--font-display)',
            letterSpacing: 'var(--letter-spacing-display)',
            color: accent,
          }}
          title={formatCurrency(account.balance)}
        >
          {formatCurrency(account.balance)}
        </p>
        {isEmpty && (
          <p className="text-[11px] text-subtext mt-1 italic">
            Empieza a llenar tu apartado con una primera aportación.
          </p>
        )}
      </div>

      {/* Estado de meta: badge prominente cuando se alcanza, barra mientras se progresa */}
      {hasGoal && goalReached ? (
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
          }}
        >
          <span
            aria-hidden="true"
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 savings-goal-check"
            style={{ background: accent, color: 'white' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight" style={{ color: accent }}>
              Meta alcanzada
            </p>
            {overage > 0.005 ? (
              <p className="text-[11px] text-subtext leading-tight tabular-nums">
                +{formatCurrency(overage)} sobre tu meta
              </p>
            ) : (
              <p className="text-[11px] text-subtext leading-tight">¡Lo conseguiste!</p>
            )}
          </div>
        </div>
      ) : hasGoal ? (
        <div>
          <div className="flex items-baseline justify-between text-[11px] mb-1.5">
            <span className="text-subtext">{progress.toFixed(0)}% de la meta</span>
            <span className="font-semibold tabular-nums text-subtext">
              Falta {formatCurrency(Math.max(0, account.target_amount! - account.balance))}
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
      ) : null}

      {/* Acciones */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={onDeposit}
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          style={{ background: accent }}
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Aportar
        </button>
        <button
          onClick={onWithdraw}
          disabled={account.balance < 0.01}
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-text bg-surface border border-border hover:bg-border transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          title={account.balance < 0.01 ? 'No hay saldo' : 'Retirar al balance líquido'}
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
          </svg>
          Retirar
        </button>
      </div>
    </TiltCard>
  )
}
