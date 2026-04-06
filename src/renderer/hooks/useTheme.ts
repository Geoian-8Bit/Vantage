import { useState, useEffect } from 'react'

export interface ThemeOption {
  id: string
  name: string
  colors: { brand: string; sidebar: string; surface: string; card: string; text: string }
}

export const THEMES: ThemeOption[] = [
  {
    id: 'corporativo',
    name: 'Corporativo',
    colors: { brand: '#7A1B2D', sidebar: '#1A1A1D', surface: '#F7F6F5', card: '#FFFFFF', text: '#2D2D2F' },
  },
  {
    id: 'oscuro',
    name: 'Oscuro',
    colors: { brand: '#3B82F6', sidebar: '#0A0A0C', surface: '#0F0F12', card: '#18181B', text: '#F1F5F9' },
  },
  {
    id: 'claro',
    name: 'Claro',
    colors: { brand: '#2563EB', sidebar: '#F8FAFC', surface: '#F1F5F9', card: '#FFFFFF', text: '#1E293B' },
  },
  {
    id: 'oceanico',
    name: 'Oceánico',
    colors: { brand: '#0D9488', sidebar: '#0C1222', surface: '#F0F9FF', card: '#FFFFFF', text: '#1E293B' },
  },
  {
    id: 'naturaleza',
    name: 'Naturaleza',
    colors: { brand: '#4D7C0F', sidebar: '#1A1C16', surface: '#FAFAF0', card: '#FFFFFF', text: '#1C1917' },
  },
  {
    id: 'mocha',
    name: 'Mocha',
    colors: { brand: '#92400E', sidebar: '#1C1410', surface: '#FAF8F5', card: '#FFFBF5', text: '#1C1917' },
  },
]

function getStoredTheme(): string {
  return localStorage.getItem('vantage-theme') || 'corporativo'
}

export function useTheme() {
  const [theme, setThemeState] = useState(getStoredTheme)

  // Apply stored theme on cold start
  useEffect(() => {
    const stored = getStoredTheme()
    if (stored !== 'corporativo') {
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])

  function setTheme(id: string) {
    if (id === 'corporativo') {
      document.documentElement.removeAttribute('data-theme')
      localStorage.removeItem('vantage-theme')
    } else {
      document.documentElement.setAttribute('data-theme', id)
      localStorage.setItem('vantage-theme', id)
    }
    setThemeState(id)
  }

  return { theme, setTheme, themes: THEMES }
}
