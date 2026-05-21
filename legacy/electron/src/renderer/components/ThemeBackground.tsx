import { useEffect, useState } from 'react'

function readTheme(): string {
  return document.documentElement.getAttribute('data-theme') || ''
}

export function ThemeBackground() {
  const [theme, setTheme] = useState<string>(readTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  // Clay y todas sus variantes de paleta usan el mismo fondo (clay-warmth)
  const isClay = theme.startsWith('clay-')
  if (!isClay) return null

  return (
    <div className="theme-fx" aria-hidden="true">
      <div className="clay-warmth" />
    </div>
  )
}
