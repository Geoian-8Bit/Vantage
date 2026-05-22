/**
 * Parser de tickets de compra españoles.
 *
 * Recibe el texto plano que produce Tesseract.js leyendo la foto del
 * ticket, y extrae los tres campos que nos importan para pre-rellenar
 * la transacción: importe total, fecha y comercio.
 *
 * No es magia: tickets térmicos arrugados, mal iluminados o con tinta
 * saltada producen texto pobre y las regex fallan. La UI debe dejar al
 * usuario editar lo que sea necesario antes de guardar.
 */

export interface ParsedReceipt {
  amount: number | null
  date: string | null // YYYY-MM-DD
  merchant: string | null
}

const KNOWN_MERCHANTS = [
  'MERCADONA',
  'CARREFOUR',
  'DIA',
  'LIDL',
  'ALCAMPO',
  'EROSKI',
  'CONSUM',
  'HIPERCOR',
  'EL CORTE INGLES',
  'EL CORTE INGLÉS',
  'AHORRAMAS',
  'AHORRA MAS',
  'AHORRAMÁS',
  'ALDI',
  'BONPREU',
  'BONÀREA',
  'BONAREA',
  'CONDIS',
  'MASYMAS',
  'MAS Y MAS',
  'MÁS Y MÁS',
  'CAPRABO',
  'GADIS',
  'SPAR',
  'CASH FRESH',
  'COVIRAN',
  'COVIRÁN',
  'FROIZ',
  'BM',
  'SUPERCOR',
  'SIMPLY',
  'AMAZON',
  'IKEA',
  'LEROY MERLIN',
  'DECATHLON',
  'ZARA',
  'H&M',
  'PRIMARK',
  'MEDIA MARKT',
  'FNAC',
  'WORTEN',
  'BURGER KING',
  'MCDONALDS',
  "MCDONALD'S",
  'KFC',
  'TELEPIZZA',
  'DOMINOS',
  "DOMINO'S",
  'STARBUCKS',
] as const

// Número con dos decimales. Admite separadores de miles ES ("1.234,56") y
// formato US ("1234.56" o "1,234.56").
const AMOUNT_RE = /-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}/

const TOTAL_PATTERNS = [
  // Variantes habituales en español. El número va al final, con punto o
  // coma decimal, y opcionalmente con símbolo €.
  new RegExp(
    `\\b(?:TOTAL\\s+A\\s+PAGAR|IMPORTE\\s+TOTAL|TOTAL\\s+TICKET|TOTAL\\s+COMPRA|TOTAL)\\b[^\\d-]{0,15}(${AMOUNT_RE.source})\\s*(?:€|EUR)?`,
    'i'
  ),
  new RegExp(
    `\\b(?:IMPORTE|A\\s+PAGAR)\\b[^\\d-]{0,10}(${AMOUNT_RE.source})\\s*(?:€|EUR)?`,
    'i'
  ),
]

const DATE_PATTERNS = [
  // dd/mm/yyyy o dd-mm-yyyy. Año de 4 dígitos primero para no confundir
  // con "12/05/26" que tomamos al final.
  /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/,
  /\b(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})\b/,
  /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2})\b/,
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function normaliseAmount(raw: string): number | null {
  // En tickets ES suele ir como "23,45" o "23.45". A veces aparece como
  // "1.234,56". Normalizamos a punto decimal.
  const cleaned = raw.trim().replace(/\s/g, '')
  // Si tiene punto y coma, asumimos punto = miles, coma = decimal.
  let normalised: string
  if (cleaned.includes('.') && cleaned.includes(',')) {
    normalised = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    normalised = cleaned.replace(',', '.')
  } else {
    normalised = cleaned
  }
  const n = parseFloat(normalised)
  if (isNaN(n)) return null
  if (n <= 0) return null
  // Filtro de sanidad: > 100.000 € en un ticket de la compra es ruido OCR.
  if (n > 100_000) return null
  return Math.round(n * 100) / 100
}

function parseAmount(text: string): number | null {
  for (const re of TOTAL_PATTERNS) {
    const match = text.match(re)
    if (match?.[1]) {
      const n = normaliseAmount(match[1])
      if (n !== null) return n
    }
  }
  // Fallback: el mayor importe con dos decimales y símbolo € del ticket.
  // Es heurística — algunos tickets no escriben "TOTAL" como tal.
  const candidates: number[] = []
  const re = new RegExp(`(${AMOUNT_RE.source})\\s*(?:€|EUR)`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const n = normaliseAmount(m[1]!)
    if (n !== null) candidates.push(n)
  }
  if (candidates.length === 0) return null
  return Math.max(...candidates)
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (y < 2000 || y > 2100) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  )
}

function parseDate(text: string): string | null {
  // dd/mm/yyyy (formato más habitual en tickets ES)
  const m1 = text.match(DATE_PATTERNS[0]!)
  if (m1) {
    const d = Number(m1[1])
    const m = Number(m1[2])
    const y = Number(m1[3])
    if (isValidYmd(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`
  }
  // yyyy/mm/dd
  const m2 = text.match(DATE_PATTERNS[1]!)
  if (m2) {
    const y = Number(m2[1])
    const m = Number(m2[2])
    const d = Number(m2[3])
    if (isValidYmd(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`
  }
  // dd/mm/yy → asumimos 20YY (la app no existía antes del 2000).
  const m3 = text.match(DATE_PATTERNS[2]!)
  if (m3) {
    const d = Number(m3[1])
    const m = Number(m3[2])
    const yy = Number(m3[3])
    const y = 2000 + yy
    if (isValidYmd(y, m, d)) return `${y}-${pad(m)}-${pad(d)}`
  }
  return null
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function parseMerchant(text: string): string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  const upperLines = lines.map((l) => l.toUpperCase())

  // 1. Si una línea contiene una cadena de marca conocida, devolvemos esa
  // línea (ej: "Carrefour Express", "Mercadona S.A.") en title case, sin
  // ruido como CIFs.
  for (let i = 0; i < upperLines.length; i++) {
    const upper = upperLines[i]!
    for (const name of KNOWN_MERCHANTS) {
      if (upper.includes(name)) {
        const cleaned = lines[i]!
          .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s&'.,-]/g, '')
          .replace(/\bS\.?A\.?\b/i, '')
          .replace(/\bS\.?L\.?\b/i, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
          .replace(/[.,]+$/, '')
          .trim()
        return toTitleCase(cleaned || name)
      }
    }
  }
  // 2. Fallback: la primera línea no vacía con > 3 caracteres y al menos
  // alguna letra (descarta líneas de "===" o números puros).
  for (const line of lines) {
    if (line.length < 3) continue
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(line)) continue
    // Filtros simples: descartamos líneas que parecen direcciones, CIFs,
    // teléfonos o "TICKET".
    if (/^(C[/]|AVDA|AVENIDA|CALLE|TICKET|FACTURA|N[º°]|TEL\.?)/i.test(line)) continue
    if (/^\d/.test(line)) continue
    if (/^[A-Z]\d{8}$/.test(line)) continue
    // Limpiamos restos no alfanuméricos típicos de OCR ruidoso.
    const cleaned = line.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s&'.-]/g, '').trim()
    if (cleaned.length >= 3) {
      return cleaned === cleaned.toUpperCase() ? toTitleCase(cleaned) : cleaned
    }
  }
  return null
}

export function parseReceipt(rawText: string): ParsedReceipt {
  if (!rawText) return { amount: null, date: null, merchant: null }
  // Normalizamos espacios duplicados y caracteres invisibles.
  const text = rawText.replace(/ /g, ' ').replace(/\r/g, '')
  return {
    amount: parseAmount(text),
    date: parseDate(text),
    merchant: parseMerchant(text),
  }
}
