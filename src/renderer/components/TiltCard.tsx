import { forwardRef, useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react'

interface TiltCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** intensidad del tilt en grados (default 6) */
  intensity?: number
  /** disable tilt cuando el elemento está deshabilitado */
  disabled?: boolean
  onClick?: () => void
  as?: 'div' | 'button'
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
  title?: string
}

/**
 * Componente que añade tracking de cursor para tilt 3D.
 * NO aplica el transform directamente — solo setea CSS variables
 *   --tilt-x, --tilt-y
 * que el consumidor usa en su propio transform vía CSS.
 *
 * Esto evita conflictos con animaciones de entrada y :hover styles
 * que también modifican el transform.
 */
export const TiltCard = forwardRef<HTMLElement, TiltCardProps>(function TiltCard({
  children,
  className = '',
  style,
  intensity = 6,
  disabled = false,
  onClick,
  as = 'div',
  type = 'button',
  ariaLabel,
  title,
}, ref) {
  const innerRef = useRef<HTMLElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })

  const setRef = (el: HTMLElement | null) => {
    innerRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as { current: HTMLElement | null }).current = el
  }

  const animate = () => {
    const el = innerRef.current
    if (!el) return
    // Lerp suave hacia target
    currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.18
    currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.18
    el.style.setProperty('--tilt-x', `${currentRef.current.x.toFixed(2)}deg`)
    el.style.setProperty('--tilt-y', `${currentRef.current.y.toFixed(2)}deg`)

    const dx = targetRef.current.x - currentRef.current.x
    const dy = targetRef.current.y - currentRef.current.y
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      rafRef.current = requestAnimationFrame(animate)
    } else {
      rafRef.current = null
    }
  }

  const ensureRaf = () => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(animate)
    }
  }

  const handleMove = (e: MouseEvent<HTMLElement>) => {
    if (disabled) return
    const el = innerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    targetRef.current.y = (x - 0.5) * intensity * 2
    targetRef.current.x = (0.5 - y) * intensity * 2
    ensureRaf()
  }

  const handleLeave = () => {
    targetRef.current.x = 0
    targetRef.current.y = 0
    ensureRaf()
  }

  const sharedProps = {
    ref: setRef as never,
    className,
    style,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    onClick: disabled ? undefined : onClick,
    'aria-label': ariaLabel,
    title,
  }

  if (as === 'button') {
    return <button {...sharedProps} type={type} disabled={disabled}>{children}</button>
  }
  return <div {...sharedProps}>{children}</div>
})
