'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'vantage-rollover-enabled'
const listeners = new Set<() => void>()
let cached: boolean | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  if (cached === undefined) {
    try {
      cached = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      cached = false
    }
  }
  return cached
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Toggle de "rollover" (acumular balance no ahorrado de meses anteriores).
 * Persistido en localStorage. Sincronizado entre componentes con
 * useSyncExternalStore.
 */
export function useRolloverEnabled() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  function toggle() {
    const next = !enabled
    cached = next
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      // ignore
    }
    listeners.forEach((l) => l())
  }

  return { enabled, toggle }
}
