import { formatCurrency } from '../../lib/utils'

interface Props {
  price: number
  /** Cambio porcentual respecto a un baseline (positivo = sube). Si se omite, no se muestra delta. */
  changePct?: number
  /** Si true, marca este precio como el mínimo entre los comparados (corona ⭐). */
  isMin?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** "currency" muestra €, "unit" añade /unidad/L/kg si se indica */
  unitSuffix?: string
  className?: string
}

/**
 * Pill con precio y opcionalmente delta de variación. Usa números tabulares
 * para evitar saltos al cambiar el precio. El delta se colorea según signo:
 *   - bajada (negativo) → verde income
 *   - subida (positivo) → rojo expense
 *   - 0 / sin delta     → gris subtext
 */
export function PriceTag({ price, changePct, isMin = false, size = 'md', unitSuffix, className = '' }: Props) {
  const sizes = {
    sm: { price: 'text-sm',    delta: 'text-[10px]' },
    md: { price: 'text-base',  delta: 'text-xs' },
    lg: { price: 'text-2xl',   delta: 'text-xs' },
  }
  const s = sizes[size]

  const hasDelta = typeof changePct === 'number' && Number.isFinite(changePct)
  const deltaColor = !hasDelta || Math.abs(changePct!) < 0.1
    ? 'var(--color-subtext)'
    : changePct! < 0
      ? 'var(--color-income)'
      : 'var(--color-expense)'

  const arrow = hasDelta && Math.abs(changePct!) >= 0.1
    ? (changePct! < 0 ? '↓' : '↑')
    : '·'

  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      {isMin && (
        <span
          aria-label="Mejor precio"
          title="Mejor precio"
          className="text-amber-500"
          style={{ color: 'var(--shop-accent)', fontSize: '0.85em', lineHeight: 1, marginRight: 1 }}
        >
          ★
        </span>
      )}
      <span
        className={`font-bold tabular-nums ${s.price}`}
        style={{
          color: 'var(--color-text)',
          fontFamily: 'var(--font-numeric)',
          letterSpacing: '-0.01em',
        }}
      >
        {formatCurrency(price)}
      </span>
      {unitSuffix && (
        <span className="text-[10px] font-medium" style={{ color: 'var(--color-subtext)' }}>
          /{unitSuffix}
        </span>
      )}
      {hasDelta && (
        <span
          className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${s.delta}`}
          style={{ color: deltaColor }}
          aria-label={`${changePct! < 0 ? 'Bajada' : 'Subida'} de ${Math.abs(changePct!).toFixed(1)}%`}
        >
          <span aria-hidden="true">{arrow}</span>
          {Math.abs(changePct!).toFixed(1)}%
        </span>
      )}
    </span>
  )
}
