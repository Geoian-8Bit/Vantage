import { type NextRequest } from 'next/server'

import { requireUser } from '@/lib/auth/session'
import { jsonOk, jsonError } from '@/lib/api/response'
import { autoDetectMapping, type RawImportRow } from '@/lib/utils/importValidation'

export const runtime = 'nodejs'

const ALLOWED_EXT = ['.xlsx', '.xls', '.csv']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  try {
    await requireUser()
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return jsonError(new Error('Falta el archivo'))
    }
    if (file.size > MAX_BYTES) {
      return jsonError(new Error(`Archivo demasiado grande (máx ${MAX_BYTES / 1024 / 1024} MB)`))
    }
    const name = file.name.toLowerCase()
    if (!ALLOWED_EXT.some((ext) => name.endsWith(ext))) {
      return jsonError(new Error('Formato no soportado. Usa .xlsx, .xls o .csv'))
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: false })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) {
      return jsonError(new Error('El archivo no tiene hojas'))
    }
    const sheet = wb.Sheets[sheetName]!
    const json = XLSX.utils.sheet_to_json<RawImportRow>(sheet, { defval: '', raw: false })
    if (json.length === 0) {
      return jsonError(new Error('La hoja está vacía'))
    }
    const headers = Object.keys(json[0]!)
    const mapping = autoDetectMapping(headers)

    return jsonOk({
      sheetName,
      headers,
      mapping,
      rows: json.slice(0, 500), // limitamos a 500 rows por seguridad
      total: json.length,
    })
  } catch (err) {
    return jsonError(err)
  }
}
