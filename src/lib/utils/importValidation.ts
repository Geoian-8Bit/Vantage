export type RawImportRow = Record<string, string>

export interface ColumnMapping {
  amount: string | null
  type: string | null
  date: string | null
  description: string | null
  category: string | null
}

export interface ValidImportRow {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category: string
}

export interface InvalidImportRow {
  rowIndex: number
  rawRow: RawImportRow
  reason: string
}

export interface ImportValidationResult {
  validRows: ValidImportRow[]
  invalidRows: InvalidImportRow[]
}

const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (DATE_ISO_RE.test(s)) return s
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  const parts = s.split('/')
  if (parts.length === 3 && parts[2]!.length === 4) {
    const iso = `${parts[2]}-${parts[1]!.padStart(2, '0')}-${parts[0]!.padStart(2, '0')}`
    const d2 = new Date(iso)
    if (!isNaN(d2.getTime())) return iso
  }
  const dashParts = s.split('-')
  if (
    dashParts.length === 3 &&
    dashParts[0]!.length <= 2 &&
    dashParts[2]!.length === 4
  ) {
    const iso = `${dashParts[2]}-${dashParts[1]!.padStart(2, '0')}-${dashParts[0]!.padStart(2, '0')}`
    const d3 = new Date(iso)
    if (!isNaN(d3.getTime())) return iso
  }
  return null
}

function parseType(raw: string): 'income' | 'expense' | null {
  const v = raw.trim().toLowerCase()
  if (['income', 'ingreso', 'ingresos', 'entrada', 'entradas', '+', 'haber'].includes(v))
    return 'income'
  if (['expense', 'gasto', 'gastos', 'salida', 'salidas', '-', 'debe'].includes(v))
    return 'expense'
  return null
}

function parseAmount(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[€$£\s]/g, '')
    .replace(/\.(?=\d{3}(,|$))/g, '')
    .replace(',', '.')
  const n = parseFloat(cleaned)
  if (isNaN(n) || n === 0) return null
  return n
}

export function validateRows(
  rows: RawImportRow[],
  mapping: ColumnMapping
): ImportValidationResult {
  const validRows: ValidImportRow[] = []
  const invalidRows: InvalidImportRow[] = []

  rows.forEach((row, index) => {
    const rawAmount = mapping.amount ? row[mapping.amount] ?? '' : ''
    const rawType = mapping.type ? row[mapping.type] ?? '' : ''
    const rawDate = mapping.date ? row[mapping.date] ?? '' : ''
    const rawDesc = mapping.description ? row[mapping.description] ?? '' : ''
    const rawCat = mapping.category ? row[mapping.category] ?? '' : ''

    const amount = parseAmount(rawAmount)
    if (amount === null) {
      invalidRows.push({
        rowIndex: index + 1,
        rawRow: row,
        reason: `Importe inválido: "${rawAmount}"`,
      })
      return
    }

    let type = parseType(rawType)
    // Si no hay columna de tipo, lo inferimos por el signo del importe
    if (!mapping.type && type === null) {
      type = amount < 0 ? 'expense' : 'income'
    }
    if (type === null) {
      invalidRows.push({
        rowIndex: index + 1,
        rawRow: row,
        reason: `Tipo inválido: "${rawType}" (usa Ingreso/Gasto o Income/Expense)`,
      })
      return
    }

    const date = parseDate(rawDate)
    if (date === null) {
      invalidRows.push({
        rowIndex: index + 1,
        rawRow: row,
        reason: `Fecha inválida: "${rawDate}"`,
      })
      return
    }

    validRows.push({
      amount: Math.abs(amount),
      type,
      description: rawDesc.trim(),
      date,
      category: rawCat.trim() || 'Otros',
    })
  })

  return { validRows, invalidRows }
}

const COLUMN_HINTS: Record<keyof ColumnMapping, string[]> = {
  date: ['fecha', 'date', 'día', 'dia'],
  amount: ['importe', 'amount', 'cantidad', 'total', 'monto', 'euros', '€'],
  type: ['tipo', 'type', 'movimiento'],
  description: ['descripción', 'descripcion', 'description', 'concepto', 'detalle'],
  category: ['categoría', 'categoria', 'category'],
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const normalize = (s: string) => s.toLowerCase().trim()
  const mapping: ColumnMapping = {
    amount: null,
    type: null,
    date: null,
    description: null,
    category: null,
  }
  const taken = new Set<string>()
  for (const key of Object.keys(COLUMN_HINTS) as (keyof ColumnMapping)[]) {
    const hints = COLUMN_HINTS[key]
    for (const h of hints) {
      const match = headers.find((hd) => !taken.has(hd) && normalize(hd).includes(h))
      if (match) {
        mapping[key] = match
        taken.add(match)
        break
      }
    }
  }
  return mapping
}
