import 'server-only'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

/**
 * Devuelve el usuario autenticado de la sesión actual, o null si no hay sesión.
 * Server-side. Para client components, usa el hook `useUser` (Fase 3.3).
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Devuelve el usuario o redirige a /login si no hay sesión.
 * Usar en server components y API routes que requieren auth.
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}
