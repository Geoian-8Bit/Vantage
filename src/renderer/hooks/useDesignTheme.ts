import { useEffect, useState } from 'react'

export type DesignThemeId =
  | 'corporativo'
  | 'clay'
  | 'clay-botanical'
  | 'clay-tea'
  | 'clay-mediterranean'

export type ThemeMode = 'light' | 'dark'

export interface DesignThemePreview {
  bg: string
  card: string
  brand: string
  accent: string
  text: string
}

export interface DesignThemeMeta {
  id: DesignThemeId
  name: string
  tagline: string
  defaultMode: ThemeMode
  preview: DesignThemePreview
  previewDark?: DesignThemePreview
}

export const DESIGN_THEMES: DesignThemeMeta[] = [
  {
    id: 'corporativo',
    name: 'Corporativo',
    tagline: 'Vino y dorado clásico',
    defaultMode: 'light',
    preview: { bg: '#F7F6F5', card: '#FFFFFF', brand: '#7A1B2D', accent: '#C9A84C', text: '#2D2D2F' },
    previewDark: { bg: '#18181B', card: '#23232A', brand: '#C24B5E', accent: '#E0BD66', text: '#F1F1F3' },
  },
  {
    id: 'clay',
    name: 'Soft Clay',
    tagline: 'Bento orgánico cálido',
    defaultMode: 'light',
    preview: { bg: '#EDE8E1', card: '#FFFFFF', brand: '#FF7A59', accent: '#6B5BFF', text: '#2A2520' },
    previewDark: { bg: '#1F1B1A', card: '#2D2826', brand: '#FF8C73', accent: '#8676FF', text: '#F5F0EA' },
  },
  {
    id: 'clay-botanical',
    name: 'Botánico',
    tagline: 'Verde olivo y bermejo',
    defaultMode: 'light',
    preview: { bg: '#EFE8D5', card: '#F8F2DF', brand: '#5B7A3A', accent: '#B85C2E', text: '#2D3818' },
    previewDark: { bg: '#1A1F12', card: '#232A17', brand: '#98B864', accent: '#D8896A', text: '#EAE6D2' },
  },
  {
    id: 'clay-tea',
    name: 'Tea House',
    tagline: 'Papel arroz y matcha',
    defaultMode: 'light',
    preview: { bg: '#F4EBDC', card: '#FAF3E2', brand: '#B91D1D', accent: '#5C7A3C', text: '#1F1B16' },
    previewDark: { bg: '#1A1614', card: '#232017', brand: '#E63838', accent: '#95B069', text: '#EFE6D5' },
  },
  {
    id: 'clay-mediterranean',
    name: 'Mediterráneo',
    tagline: 'Azul marino y dorado',
    defaultMode: 'light',
    preview: { bg: '#F4EFE6', card: '#FCF8EE', brand: '#1B5E8C', accent: '#C9A24E', text: '#1B3A5C' },
    previewDark: { bg: '#0F1F2E', card: '#182333', brand: '#5BA0CB', accent: '#FFD580', text: '#EFE8D5' },
  },
]

const DEFAULT_THEME: DesignThemeId = 'corporativo'
const DEFAULT_MODE: ThemeMode = 'light'

const STORAGE_KEY = 'vantage-theme'

function parseStoredTheme(value: string | null): { id: DesignThemeId; mode: ThemeMode } | null {
  if (!value) return null
  // Acepta corporativo o cualquier variante Clay: corporativo-light, clay-dark, clay-botanical-light…
  const match = value.match(/^(corporativo|clay(?:-(?:botanical|tea|mediterranean))?)-(light|dark)$/)
  if (!match) {
    // Tema antiguo o no soportado: limpiar para volver al :root (Corporativo)
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    return null
  }
  return { id: match[1] as DesignThemeId, mode: match[2] as ThemeMode }
}

/* Toggle de la clase .theme-transition: se añade un instante antes de cambiar
   los tokens y se quita 520ms después. Mientras está activa, todos los
   elementos hacen crossfade de background/color/border/shadow vía la regla
   global de globals.css. Sin esto el cambio de paleta es brusco. */
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
  localStorage.setItem(STORAGE_KEY, composed)
}

/* Aplica el tema con crossfade visible: marca la transición y cede un frame
   para que la clase entre en vigor antes de cambiar los tokens. Solo para
   cambios disparados por el usuario, NO para el bootstrap inicial. */
function applyThemeWithTransition(id: DesignThemeId, mode: ThemeMode) {
  flagThemeTransition()
  requestAnimationFrame(() => applyTheme(id, mode))
}

export function useDesignTheme() {
  const [state, setState] = useState<{ id: DesignThemeId; mode: ThemeMode } | null>(() => {
    if (typeof window === 'undefined') return null
    return parseStoredTheme(localStorage.getItem(STORAGE_KEY))
  })

  useEffect(() => {
    if (state) applyTheme(state.id, state.mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setTheme(id: DesignThemeId) {
    const meta = DESIGN_THEMES.find(t => t.id === id)!
    const mode = state?.id === id ? state.mode : (state?.mode ?? meta.defaultMode)
    applyThemeWithTransition(id, mode)
    setState({ id, mode })
  }

  function setMode(mode: ThemeMode) {
    if (!state) {
      applyThemeWithTransition(DEFAULT_THEME, mode)
      setState({ id: DEFAULT_THEME, mode })
      return
    }
    applyThemeWithTransition(state.id, mode)
    setState({ id: state.id, mode })
  }

  function toggleMode() {
    setMode(state?.mode === 'dark' ? 'light' : 'dark')
  }

  function clearDesignTheme() {
    document.documentElement.removeAttribute('data-theme')
    localStorage.removeItem(STORAGE_KEY)
    setState(null)
  }

  // Si no hay selección, el aspecto visible es el `:root` (Corporativo Vino).
  // Reflejarlo en activeId/activeMode para que el switcher lo muestre marcado.
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
