import { useEffect, useRef } from 'react'
import { useRegisterCartReceiver } from './FlyToCart'
import { formatCurrency } from '../../lib/utils'

interface Props {
  count: number
  total: number
  onClick?: () => void
}

/**
 * Pill receptora del fly-to-cart. Muestra cesta + contador + total. Se
 * registra en el FlyToCartProvider para que las animaciones converjan aquí.
 *
 * Estados:
 *   - count === 0: pill "Tu lista" en estado discreto
 *   - count >  0: pill activa con contador y total
 */
export function ShoppingCartReceiver({ count, total, onClick }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const register = useRegisterCartReceiver()
  const prevCount = useRef(count)

  // Registramos el receptor en cada cambio de mount
  useEffect(() => {
    register(ref.current)
    return () => register(null)
  }, [register])

  // Bump cuando el contador sube (independiente del fly, que también lo bumpea)
  useEffect(() => {
    if (count > prevCount.current) {
      const el = ref.current
      if (el) {
        el.classList.remove('shop-cart-receive')
        void el.offsetWidth
        el.classList.add('shop-cart-receive')
        const t = window.setTimeout(() => el.classList.remove('shop-cart-receive'), 500)
        return () => window.clearTimeout(t)
      }
    }
    prevCount.current = count
  }, [count])

  const isActive = count > 0

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={isActive ? `Lista activa: ${count} productos, total ${formatCurrency(total)}` : 'Tu lista (vacía)'}
      title={isActive ? `${count} productos · ${formatCurrency(total)}` : 'Tu lista'}
      className="inline-flex items-center gap-2 rounded-full font-semibold cursor-pointer border"
      style={{
        padding: isActive ? '6px 14px 6px 6px' : '6px 12px 6px 8px',
        background: isActive ? 'var(--shop-primary)' : 'var(--color-card)',
        color: isActive ? 'white' : 'var(--color-text)',
        borderColor: isActive ? 'var(--shop-primary)' : 'var(--color-border)',
        boxShadow: isActive
          ? '0 6px 16px color-mix(in srgb, var(--shop-primary) 32%, transparent)'
          : 'var(--shadow-sm)',
        transition: 'all var(--duration-base) var(--ease-spring)',
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 26, height: 26,
          background: isActive ? 'rgba(255,255,255,0.18)' : 'var(--shop-primary-soft)',
          color: isActive ? 'white' : 'var(--shop-primary)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6L23 6H6" />
          <circle cx="9" cy="20" r="1.6" />
          <circle cx="18" cy="20" r="1.6" />
        </svg>
      </span>
      {isActive ? (
        <span className="flex items-baseline gap-1.5 text-xs">
          <span className="tabular-nums font-bold">{count}</span>
          <span className="opacity-80">·</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </span>
      ) : (
        <span className="text-xs">Tu lista</span>
      )}
    </button>
  )
}
