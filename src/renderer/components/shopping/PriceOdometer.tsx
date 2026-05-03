import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '../../lib/utils'

interface Props {
  price: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_MAP = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
  xl: 'text-4xl',
}

/**
 * Precio que se anima al cambiar: el valor anterior sale hacia arriba con
 * fade-out y el nuevo entra desde abajo. Sensación de "odómetro".
 *
 * Usa las clases .shop-odo-* y los keyframes shop-odo-out/in definidos en
 * globals.css. Reduced-motion lo aplana automáticamente vía la regla global.
 */
export function PriceOdometer({ price, size = 'lg', className = '' }: Props) {
  // Estado: { current, prev } — cuando price cambia, prev queda con el viejo
  // durante un frame para que la animación pueda dibujar ambos a la vez.
  const [current, setCurrent] = useState(price)
  const [prev, setPrev] = useState<number | null>(null)
  const animTimer = useRef<number | null>(null)

  useEffect(() => {
    if (price === current) return
    setPrev(current)
    setCurrent(price)
    // Limpiamos prev tras la duración de la animación
    if (animTimer.current) window.clearTimeout(animTimer.current)
    animTimer.current = window.setTimeout(() => setPrev(null), 320)
    return () => {
      if (animTimer.current) window.clearTimeout(animTimer.current)
    }
  // Solo reaccionamos al cambio externo de `price`, no a `current`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price])

  return (
    <span
      className={`shop-odo-wrap font-bold tabular-nums ${SIZE_MAP[size]} ${className}`}
      style={{
        color: 'var(--color-text)',
        fontFamily: 'var(--font-numeric)',
        letterSpacing: '-0.01em',
        // Reservamos altura intrínseca para evitar layout shift mientras dura la animación
        lineHeight: 1.1,
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Capa nueva (siempre presente) */}
      <span className={prev !== null ? 'shop-odo-new' : ''} style={{ display: 'inline-block' }}>
        {formatCurrency(current)}
      </span>
      {/* Capa vieja (solo durante la transición) */}
      {prev !== null && (
        <span
          aria-hidden="true"
          className="shop-odo-old"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'inline-block',
          }}
        >
          {formatCurrency(prev)}
        </span>
      )}
    </span>
  )
}
