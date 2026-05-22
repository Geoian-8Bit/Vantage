import 'server-only'

import { type NextRequest } from 'next/server'

import { jsonError, jsonOk } from '@/lib/api/response'
import { ValidationError } from '@/lib/api/errors'
import { getActiveSpace } from '@/lib/auth/space'
import { requireNonAnonymousUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'receipts'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

/**
 * Sube la foto de un ticket al bucket privado `receipts`. El path tiene la
 * forma `{space_id}/{uuid}.{ext}` para que las policies de storage validen
 * pertenencia al space por el primer segmento del path.
 *
 * Rechaza:
 * - Usuarios anónimos (modo demo, read-only).
 * - Mime types fuera de la whitelist (también filtrado por el bucket).
 * - Archivos > 10 MB.
 *
 * Devuelve `{ path }`: el cliente lo manda como `attachmentPath` al crear
 * la transacción.
 */
export async function POST(request: NextRequest) {
  try {
    await requireNonAnonymousUser()
    const space = await getActiveSpace()

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      throw new ValidationError('Falta el archivo en el campo "file"')
    }
    if (!ALLOWED_MIME.has(file.type)) {
      throw new ValidationError(`Tipo de archivo no permitido: ${file.type || 'desconocido'}`)
    }
    if (file.size > MAX_BYTES) {
      throw new ValidationError('La foto supera el tamaño máximo (10 MB)')
    }

    const ext = EXT_BY_MIME[file.type] ?? 'bin'
    const path = `${space.id}/${crypto.randomUUID()}.${ext}`

    const supabase = await createClient()
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (error) {
      // RLS suele devolver "new row violates row-level security policy".
      throw new Error(`Storage: ${error.message}`)
    }

    return jsonOk({ path }, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}
