'use client'

import { useSyncExternalStore } from 'react'

import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  DESIGN_THEMES,
  THEME_STORAGE_KEY,
  type DesignThemeId,
  type ThemeMode,
} from './themes'

type ThemeState = { id: DesignThemeId; mode: ThemeMode } | null

const THEME_RE = /^(corporativo|clay(?:-(?:botanical|tea|mediterranean))?)-(light|dark)$/

function parseStoredTheme(value: string | null): ThemeState {
  if (!value) return null
  const match = value.match(THEME_RE)
  if (!match) return null
  return { id: match[1] as DesignThemeId, mode: match[2] as ThemeMode }
}

// ─── Store externo sincronizado con localStorage ────────────────────────────

const listeners = new Set<() => void>()
let cache: ThemeState = null
let initialised = false

function notify() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): ThemeState {
  if (typeof window === 'undefined') return null
  if (!initialised) {
    cache = parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY))
    initialised = true
  }
  return cache
}

function getServerSnapshot(): ThemeState {
  return null
}

// ─── Aplicación al DOM ──────────────────────────────────────────────────────

let themeTransitionTimer: number | undefined

function flagThemeTransition() {
  const root = document.documentElement
  root.classList.add('theme-transition')
  if (themeTransitionTimer !== undefined) window.clearTimeout(themeTransitionTimer)
  themeTransitionTimer = window.setTimeout(() => {
    root.classList.remove('theme-transition')
    themeTransitionTimer = undefined
  }, 520)
}

function applyTheme(id: DesignThemeId, mode: ThemeMode) {
  const composed = `${id}-${mode}`
  document.documentElement.setAttribute('data-theme', composed)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, composed)
  } catch {
    // Storage no disponible — el tema sigue aplicándose en runtime.
  }
  cache = { id, mode }
  notify()
}

function applyThemeWithTransition(id: DesignThemeId, mode: ThemeMode) {
  flagThemeTransition()
  requestAnimationFrame(() => applyTheme(id, mode))
}

function clearAll() {
  document.documentElement.removeAttribute('data-theme')
  try {
    localStorage.removeItem(THEME_STORAGE_KEY)
  } catch {
    // ignore
  }
  cache = null
  notify()
}

/**
 * Hook de tema visual. Persiste en `localStorage.vantage-theme`. El bootstrap
 * inicial (antes de hidratar React) lo hace ThemeBootstrap; este hook
 * sincroniza el estado React con lo aplicado al <html> a través de un store
 * externo y useSyncExternalStore.
 */
export function useDesignTheme() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  function setTheme(id: DesignThemeId) {
    const meta = DESIGN_THEMES.find((t) => t.id === id)!
    const mode = state?.id === id ? state.mode : (state?.mode ?? meta.defaultMode)
    applyThemeWithTransition(id, mode)
  }

  function setMode(mode: ThemeMode) {
    if (!state) {
      applyThemeWithTransition(DEFAULT_THEME, mode)
      return
    }
    applyThemeWithTransition(state.id, mode)
  }

  function toggleMode() {
    setMode(state?.mode === 'dark' ? 'light' : 'dark')
  }

  function clearDesignTheme() {
    clearAll()
  }

  const effectiveId: DesignThemeId = state?.id ?? DEFAULT_THEME
  const effectiveMode: ThemeMode = state?.mode ?? DEFAULT_MODE

  return {
    activeId: effectiveId,
    activeMode: effectiveMode,
    setTheme,
    setMode,
    toggleMode,
    clearDesignTheme,
    themes: DESIGN_THEMES,
  }
}
