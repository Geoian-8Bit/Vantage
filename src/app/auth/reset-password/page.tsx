import { redirect } from 'next/navigation'

import { PasswordInput } from '@/components/ui/PasswordInput'
import { createClient } from '@/lib/supabase/server'

import { resetPassword } from './actions'

interface ResetPasswordPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password?error=Enlace%20inválido%20o%20caducado')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-text">Nueva contraseña</h1>
          <p className="text-sm text-subtext">
            Elige una contraseña para <span className="font-semibold text-text">{user.email}</span>.
          </p>
        </div>

        <form action={resetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-text">
              Nueva contraseña
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-text">
              Confirma la contraseña
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          {error && (
            <p className="text-sm text-expense" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
          >
            Actualizar contraseña
          </button>
        </form>
      </div>
    </main>
  )
}
