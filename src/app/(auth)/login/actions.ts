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
