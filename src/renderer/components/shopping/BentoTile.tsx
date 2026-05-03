import type { ReactNode, MouseEvent } from 'react'

interface Props {
  /** Si se proporciona, el tile es clickable y aplica estado pressed */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
  /** Color del icono (token CSS o color directo) */
  accent?: string
  /** Icono mostrado en la cabecera (slot top-left) */
  icon?: ReactNode
  /** Eyebrow (label pequeño en mayúsculas en el top-right) */
  eyebrow?: string
  className?: string
  children: ReactNode
}

/**
 * Tile contenedor del bento grid del módulo Compras. Usa la clase .shop-bento
 * (definida en globals.css) que ya provee borde, sombra y hover lift.
 *
 * El icono y el eyebrow son opcionales: BentoTile sin ellos es un wrapper
 * limpio para colocar contenido custom.
 */
export function BentoTile({ onClick, accent, icon, eyebrow, className = '', children }: Props) {
  const clickable = typeof onClick === 'function'
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(e as unknown as MouseEvent<HTMLDivElement>)
        }
      } : undefined}
      data-clickable={clickable ? 'true' : undefined}
      className={`shop-bento p-5 ${clickable ? 'cursor-pointer' : ''} ${className}`}
    >
      {(icon || eyebrow) && (
        <div className="flex items-start justify-between mb-3">
          {icon && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: accent ? `color-mix(in srgb, ${accent} 14%, transparent)` : 'var(--shop-primary-soft)',
                color: accent ?? 'var(--shop-primary)',
              }}
            >
              {icon}
            </div>
          )}
          {eyebrow && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-subtext shrink-0 ml-auto">
              {eyebrow}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
