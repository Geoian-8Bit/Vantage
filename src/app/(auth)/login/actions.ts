'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.string().email('Introduce un email válido'),
})

export async function sendMagicLink(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Email inválido'
    redirect(`/login?error=${encodeURIComponent(message)}`)
  }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000'

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(parsed.data.email)}`)
}
