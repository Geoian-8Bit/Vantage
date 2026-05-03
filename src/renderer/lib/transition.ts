import { flushSync } from 'react-dom'

interface DocumentWithViewTransition extends Document {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>
    ready: Promise<void>
    updateCallbackDone: Promise<void>
  }
}

/**
 * Ejecuta un cambio de estado con View Transitions API si el navegador
 * la soporta (Chromium 111+, Electron actual). En el callback aplicamos
 * flushSync para forzar a React a actualizar el DOM síncronamente,
 * de forma que el browser pueda capturar el "después" inmediatamente.
 *
 * Si el navegador no soporta la API, ejecuta el update normal sin animación.
 *
 * Uso:
 *   transitionView(() => setActiveModule('expenses'))
 */
export function transitionView(update: () => void): void {
  const doc = document as DocumentWithViewTransition

  // Respeta prefers-reduced-motion: si el usuario lo ha activado, sin transición
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced || typeof doc.startViewTransition !== 'function') {
    update()
    return
  }

  doc.startViewTransition(() => {
    flushSync(update)
  })
}

/**
 * Devuelve el "module group" para asignar view-transition-name al main
 * wrapper. Permite que las navegaciones internas dentro del mismo módulo
 * (dashboard ↔ movimientos ↔ stats ↔ calendario) compartan el mismo
 * elemento, y solo se anime como shared element entre hub y módulo.
 */
export function getModuleGroup(activeModule: string): 'expenses' | 'settings' | 'shopping' | null {
  if (activeModule === 'hub') return null
  if (activeModule === 'settings') return 'settings'
  if (activeModule === 'shopping') return 'shopping'
  // dashboard, expenses, analytics, calendar pertenecen al módulo Gastos
  return 'expenses'
}
