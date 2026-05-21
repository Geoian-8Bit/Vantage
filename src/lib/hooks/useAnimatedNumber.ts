'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Interpola suavemente un número cuando cambia el target. Útil para totales
 * monetarios y contadores que no deberían "saltar" bruscamente.
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
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  })

  useEffect(() => {
    if (target === targetRef.current) return
    fromRef.current = valueRef.current
    targetRef.current = target
    startedAtRef.current = null

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const tick = (now: number) => {
      if (startedAtRef.current === null) startedAtRef.current = now
      const elapsed = now - startedAtRef.current
      const t = Math.min(1, elapsed / duration)
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
  }, [target, duration])

  return value
}
