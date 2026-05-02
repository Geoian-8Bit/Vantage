import { useCallback, useState, type MouseEvent } from 'react'

export interface ModalOrigin {
  x: number
  y: number
}

/**
 * Captura las coordenadas (en client space) del centro del elemento
 * que disparó la apertura de un modal, para que el modal pueda usarlas
 * como transform-origin en su animación de scale-in.
 *
 * Uso:
 *   const { origin, captureFromEvent, clear } = useModalOrigin()
 *   <button onClick={(e) => { captureFromEvent(e); setIsOpen(true) }}>...</button>
 *   <Modal isOpen={...} origin={origin} onClose={() => { setIsOpen(false); clear() }} />
 */
export function useModalOrigin() {
  const [origin, setOrigin] = useState<ModalOrigin | null>(null)

  const captureFromEvent = useCallback((e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setOrigin({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
  }, [])

  const clear = useCallback(() => setOrigin(null), [])

  return { origin, captureFromEvent, setOrigin, clear }
}

/** Helper para calcular el centro de un elemento en client coords */
export function originFromElement(el: HTMLElement): ModalOrigin {
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}
