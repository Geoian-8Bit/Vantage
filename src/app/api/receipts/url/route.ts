import 'server-only'

import { type NextRequest } from 'next/server'

import { jsonError, jsonOk } from '@/lib/api/response'
import { ForbiddenError, ValidationError } from '@/lib/api/errors'
import { getActiveSpace } from '@/lib/auth/space'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'receipts'
const SIGNED_URL_TTL_SECONDS = 60 * 10 // 10 min

/**
 * Genera una signed URL temporal para visualizar el adjunto de una
 * transacción. El path se pasa por query string y se valida que pertenece
 * al space activo del usuario antes de firmar.
 */
export async function GET(request: NextRequest) {
  try {
    const space = await getActiveSpace()
    const path = request.nextUrl.searchParams.get('path')
    if (!path) throw new ValidationError('Falta query param "path"')

    // El primer segmento del path debe ser el space_id activo. Esto evita
    // que un usuario pueda firmar paths de otros spaces aunque las RLS lo
    // rechacen igualmente.
    const firstSegment = path.split('/')[0]
    if (firstSegment !== space.id) {
      throw new ForbiddenError('El archivo no pertenece a tu space')
    }

    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error || !data) throw new Error(`Storage: ${error?.message ?? 'sin datos'}`)

    return jsonOk({ url: data.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS })
  } catch (err) {
    return jsonError(err)
  }
}
