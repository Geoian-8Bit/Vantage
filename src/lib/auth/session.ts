import 'server-only'

import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { DemoForbiddenError } from '@/lib/api/errors'

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

/** True si el user entró via "Probar demo" (signInAnonymously). */
export function isAnonymous(user: User): boolean {
  return user.is_anonymous === true
}

/**
 * Como requireUser pero además rechaza usuarios anonymous (visitantes del demo).
 * Lanza DemoForbiddenError → jsonError lo mapea a 403 con mensaje claro.
 * Usar en endpoints que NO deben estar disponibles en el demo: importar
 * Access, backup export/restore, export PDF, cualquier mutación sobre la
 * propia cuenta (email/password/MFA/borrado).
 */
export async function requireNonAnonymousUser(): Promise<User> {
  const user = await requireUser()
  if (isAnonymous(user)) {
    throw new DemoForbiddenError()
  }
  return user
}
