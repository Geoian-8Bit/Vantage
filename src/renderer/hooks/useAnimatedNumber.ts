import { useEffect, useRef, useState } from 'react'

/**
 * Hook que devuelve un número que se interpola suavemente cuando cambia el target.
 * Útil para totales monetarios, contadores y cualquier valor que cambie sin querer
 * que "salte" bruscamente.
 *
 * @param target valor objetivo
 * @param duration duración de la animación en ms (default 600)
 */
export function useAnimatedNumber(target: number, duration = 600): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const startedAtRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef(target)

  useEffect(() => {
    if (target === targetRef.current) return
    fromRef.current = value
    targetRef.current = target
    startedAtRef.current = null

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const tick = (now: number) => {
      if (startedAtRef.current === null) startedAtRef.current = now
      const elapsed = now - startedAtRef.current
      const t = Math.min(1, elapsed / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = fromRef.current + (targetRef.current - fromRef.current) * eased
      setValue(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return value
}
