'use client'

import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export function GoogleOAuthButton({ label = 'Continuar con Google' }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      })
      if (error) throw error
      // signInWithOAuth redirige al provider, así que en el flujo normal no
      // volvemos aquí. Si por algún motivo no redirige, salimos del loading.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar OAuth')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-subtext/40 border-t-text" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
              fill="#EA4335"
            />
          </svg>
        )}
        {loading ? 'Redirigiendo…' : label}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-expense" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

export function OAuthDivider() {
  return (
    <div className="relative my-2 flex items-center" aria-hidden="true">
      <div className="flex-1 border-t border-border" />
      <span className="px-3 text-[11px] font-medium uppercase tracking-wider text-subtext">
        o
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}
