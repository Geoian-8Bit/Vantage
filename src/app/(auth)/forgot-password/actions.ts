'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.string().email('Introduce un email válido'),
})

export async function requestPasswordReset(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Email inválido'
    redirect(`/forgot-password?error=${encodeURIComponent(message)}`)
  }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000'

  // Por seguridad, no revelamos si el email existe o no — siempre mostramos
  // "te enviamos un email si la cuenta existe".
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  })

  redirect(`/forgot-password?sent=1&email=${encodeURIComponent(parsed.data.email)}`)
}
