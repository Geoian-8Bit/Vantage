'use client'

import { useSyncExternalStore } from 'react'

function readTheme(): string {
  if (typeof document === 'undefined') return ''
  return document.documentElement.getAttribute('data-theme') || ''
}

function subscribe(callback: () => void) {
  if (typeof document === 'undefined') return () => {}
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observer.disconnect()
}

/**
 * Capa de fondo decorativa solo para las paletas Clay: wash radial con mesh
 * cálido animado (definido en globals.css como `.theme-fx > .clay-warmth`).
 * Observa el atributo data-theme del <html> con useSyncExternalStore.
 */
export function ThemeBackground() {
  const theme = useSyncExternalStore(
    subscribe,
    readTheme,
    () => ''
  )

  const isClay = theme.startsWith('clay-')
  if (!isClay) return null

  return (
    <div className="theme-fx" aria-hidden="true">
      <div className="clay-warmth" />
    </div>
  )
}
