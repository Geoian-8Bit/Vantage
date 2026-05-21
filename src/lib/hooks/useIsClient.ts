'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/**
 * Devuelve true cuando el código se está ejecutando en el cliente (post-hydration).
 * Idiomático React 18+ con useSyncExternalStore — evita setState-in-effect.
 *
 * Útil para gates de SSR como `if (!isClient) return null` antes de usar
 * `createPortal(..., document.body)` u otras APIs solo-cliente.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
