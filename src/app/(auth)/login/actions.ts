'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export async function signIn(formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos inválidos'
    redirect(`/login?error=${encodeURIComponent(message)}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(translateError(error.message))}`)
  }

  // Si el usuario tiene 2FA TOTP activado, signInWithPassword deja la sesión
  // en AAL1 y hay que pedirle el código para subir a AAL2.
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const hasVerifiedTotp = factors?.totp.some((f) => f.status === 'verified') ?? false
  if (hasVerifiedTotp) {
    redirect('/verify-mfa')
  }

  redirect('/dashboard')
}

/**
 * Inicia sesión como usuario anonymous para entrar al demo público compartido.
 * El trigger handle_new_user lo añade automáticamente al space demo. Toda
 * acción sensible (cambiar email/password, MFA, importar, invitar, etc.) está
 * bloqueada server-side por is_anonymous y por RLS.
 */
export async function enterDemo() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInAnonymously()

  if (error) {
    const lower = error.message.toLowerCase()
    const message = lower.includes('too many') || lower.includes('rate limit')
      ? 'Demasiados accesos al demo desde tu red. Prueba en unos minutos'
      : 'No se pudo entrar al demo. Inténtalo de nuevo'
    redirect(`/login?error=${encodeURIComponent(message)}`)
  }

  redirect('/dashboard')
}

function translateError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Email o contraseña incorrectos'
  if (lower.includes('email not confirmed'))
    return 'Tienes que confirmar tu email antes de iniciar sesión'
  if (lower.includes('too many requests')) return 'Demasiados intentos. Espera unos minutos'
  return message
}
