import { type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Excluir assets estáticos del check de sesión. /sw.js y /manifest.json
    // viven en /public y deben servirse sin redirect — la spec del Service
    // Worker rechaza scripts que vengan tras un 30x, así que si pasan por
    // el middleware sin sesión, el registro del SW falla.
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|map|webmanifest)$).*)',
  ],
}
