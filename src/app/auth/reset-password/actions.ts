'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const schema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export async function resetPassword(formData: FormData) {
  const parsed = schema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos inválidos'
    redirect(`/auth/reset-password?error=${encodeURIComponent(message)}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=Sesión%20expirada')
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`)
  }

  await supabase.auth.signOut()
  redirect('/login?reset=1')
}
