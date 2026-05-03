import { SUPERMARKETS, type SupermarketId } from './types'

interface Props {
  id: SupermarketId
  /** "solid" = pill rellena con el color de marca; "soft" = tinte translúcido */
  variant?: 'solid' | 'soft' | 'dot'
  size?: 'sm' | 'md'
  /** Si true, muestra solo el dot de color (sin texto). Útil en grids densos. */
  dotOnly?: boolean
  className?: string
}

/**
 * Chip identificando un supermercado con su color de marca. Tres variantes:
 *   - solid: fondo del color, texto blanco. Para CTAs y badges fuertes.
 *   - soft : fondo translúcido + texto en color. Para uso secundario.
 *   - dot  : punto + texto. Para listas densas / filas.
 *
 * Los colores vienen de tokens CSS dentro de [data-module="shopping"], así que
 * este componente solo funciona dentro del módulo.
 */
export function SupermarketChip({ id, variant = 'soft', size = 'sm', dotOnly = false, className = '' }: Props) {
  const info = SUPERMARKETS[id]
  const color = `var(${info.cssVar})`

  if (dotOnly) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        title={info.name}
        aria-label={info.name}
      >
        <span
          aria-hidden="true"
          className="rounded-full shrink-0"
          style={{
            width: 8,
            height: 8,
            background: color,
            boxShadow: `0 0 0 1.5px color-mix(in srgb, ${color} 30%, transparent)`,
          }}
        />
      </span>
    )
  }

  const padX = size === 'md' ? 'px-3' : 'px-2'
  const padY = size === 'md' ? 'py-1' : 'py-0.5'
  const text = size === 'md' ? 'text-xs' : 'text-[10px]'

  if (variant === 'solid') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-semibold ${padX} ${padY} ${text} ${className}`}
        style={{ background: color, color: 'white' }}
      >
        {info.name}
      </span>
    )
  }

  if (variant === 'dot') {
    return (
      <span className={`inline-flex items-center gap-1.5 ${text} font-medium text-text ${className}`}>
        <span
          aria-hidden="true"
          className="rounded-full shrink-0"
          style={{ width: 7, height: 7, background: color }}
        />
        {info.name}
      </span>
    )
  }

  // soft (default)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${padX} ${padY} ${text} ${className}`}
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        className="rounded-full shrink-0"
        style={{ width: 6, height: 6, background: color }}
      />
      {info.name}
    </span>
  )
}
