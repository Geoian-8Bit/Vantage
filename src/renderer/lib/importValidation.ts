import type {
  RawImportRow,
  ColumnMapping,
  ImportValidationResult,
  InvalidImportRow,
} from '../../shared/types'
import type { CreateTransactionDTO } from '../../shared/types'

// ── Parsers ────────────────────────────────────────────────────────────────

const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // Already YYYY-MM-DD
  if (DATE_ISO_RE.test(s)) return s

  // Try JS Date parse (handles ISO with time, MM/DD/YYYY, etc.)
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)

  // DD/MM/YYYY — common in Spanish bank exports
  const parts = s.split('/')
  if (parts.length === 3 && parts[2].length === 4) {
    const iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    const d2 = new Date(iso)
    if (!isNaN(d2.getTime())) return iso
  }

  // DD-MM-YYYY
  const dashParts = s.split('-')
  if (dashParts.length === 3 && dashParts[0].length <= 2 && dashParts[2].length === 4) {
    const iso = `${dashParts[2]}-${dashParts[1].padStart(2, '0')}-${dashParts[0].padStart(2, '0')}`
    const d3 = new Date(iso)
    if (!isNaN(d3.getTime())) return iso
  }

  return null
}

function parseType(raw: string): 'income' | 'expense' | null {
  const v = raw.trim().toLowerCase()
  if (['income', 'ingreso', 'ingresos', 'entrada', 'entradas', '+', 'haber'].includes(v)) return 'income'
  if (['expense', 'gasto', 'gastos', 'salida', 'salidas', '-', 'debe'].includes(v))       return 'expense'
  return null
}

function parseAmount(raw: string): number | null {
  // Remove thousand separators and normalise decimal separator
  const cleaned = raw.trim()
    .replace(/[€$£\s]/g, '')     // strip currency symbols and spaces
    .replace(/\.(?=\d{3}(,|$))/g, '') // remove . used as thousand sep (1.234,56)
    .replace(',', '.')            // normalise decimal comma

  const n = parseFloat(cleaned)
  if (isNaN(n) || n <= 0) return null
  return n
}

// ── Main validator ─────────────────────────────────────────────────────────

export function validateRows(
  rows: RawImportRow[],
  mapping: ColumnMapping
): ImportValidationResult {
  const validRows:   CreateTransactionDTO[] = []
  const invalidRows: InvalidImportRow[]     = []

  rows.forEach((row, index) => {
    const rawAmount = mapping.amount      ? (row[mapping.amount]      ?? '') : ''
    const rawType   = mapping.type        ? (row[mapping.type]        ?? '') : ''
    const rawDate   = mapping.date        ? (row[mapping.date]        ?? '') : ''
    const rawDesc   = mapping.description ? (row[mapping.description] ?? '') : ''
    const rawCat    = mapping.category    ? (row[mapping.category]    ?? '') : ''

    const amount = parseAmount(rawAmount)
    if (amount === null) {
      invalidRows.push({
        rowIndex: index + 1,
        rawRow: row,
        reason: `Importe inválido: "${rawAmount}"`,
      })
      return
    }

    const type = parseType(rawType)
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
      amount,
      type,
      description: rawDesc.trim(),
      date,
      category: rawCat.trim() || 'Otros',
    })
  })

  return { validRows, invalidRows }
}
