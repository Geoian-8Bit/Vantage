'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const schema = z
  .object({
    email: z.string().email('Introduce un email válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export async function signUp(formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos inválidos'
    redirect(`/signup?error=${encodeURIComponent(message)}`)
  }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000'

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/login?confirmed=1`,
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(translateError(error.message))}`)
  }

  // Con la confirmación por email desactivada en Supabase, signUp ya deja una
  // sesión activa y el usuario entra directo. Si la confirmación está activa,
  // no hay sesión y le pedimos que revise su correo.
  if (data.session) {
    redirect('/dashboard')
  }

  redirect(`/signup?sent=1&email=${encodeURIComponent(parsed.data.email)}`)
}

function translateError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'Este email ya tiene una cuenta. Inicia sesión o recupera tu contraseña'
  }
  if (lower.includes('weak password')) return 'La contraseña es demasiado débil'
  if (lower.includes('rate limit') || lower.includes('too many'))
    return 'Demasiados intentos. Espera unos minutos'
  return message
}
