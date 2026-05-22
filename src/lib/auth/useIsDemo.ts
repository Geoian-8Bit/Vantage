'use client'

import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'

/**
 * Hook cliente que devuelve true si el usuario actual entró por "Probar demo"
 * (cuenta anonymous). Devuelve null mientras se está cargando — los callers
 * deben tratar null como "aún no sabemos, sé conservador".
 */
export function useIsDemo(): boolean | null {
  const [isDemo, setIsDemo] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setIsDemo(data.user?.is_anonymous === true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return isDemo
}
