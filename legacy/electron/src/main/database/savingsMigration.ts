import { getDatabase, saveDatabase } from './schema'

/**
 * Migración de colores de apartados de hex literal a slots semánticos.
 *
 * Antes los apartados guardaban un hex (ej: '#FF7A59'). Tras la introducción
 * de slots ('savings-1'..'savings-8') que se redefinen por tema, queremos que
 * los apartados existentes también se "armonicen" con la paleta activa.
 *
 * Esta migración es idempotente: solo toca filas cuyo `color` sigue siendo
 * un hex literal. Las que ya están en formato slot se ignoran.
 */

const SLOT_COUNT = 8

/** Mapa explícito de hex conocidos (paletas anteriores del form) a su slot
 *  equivalente. Cubre todas las opciones que el form ofreció en versiones
 *  previas, así la migración es exacta para los datos del usuario. */
const KNOWN_HEX_TO_SLOT: Record<string, string> = {
  // Paleta original del form (vino + dorado + verde + olivo + …)
  '#7a1b2d': 'savings-1',
  '#c9a84c': 'savings-2',
  '#1b7a4e': 'savings-3',
  '#5b7a3a': 'savings-4',
  '#1b5e8c': 'savings-5',
  '#6b5bff': 'savings-5',
  '#ff7a59': 'savings-1',
  '#b91d1d': 'savings-6',

  // Paleta intermedia Soft Clay (la que estuvo activa brevemente)
  '#f5b14d': 'savings-2',
  '#6fd3a8': 'savings-3',
  '#5da9e9': 'savings-4',
  '#f09ebb': 'savings-6',
  '#c97259': 'savings-7',
  '#7e8c99': 'savings-8',
}

/** Paleta de referencia para fallback por proximidad RGB. Usamos los valores
 *  de clay-light por ser la estética base del proyecto (DESIGN.md). */
const REFERENCE_PALETTE: { slot: string; rgb: [number, number, number] }[] = [
  { slot: 'savings-1', rgb: [0xFF, 0x7A, 0x59] },
  { slot: 'savings-2', rgb: [0xF5, 0xB1, 0x4D] },
  { slot: 'savings-3', rgb: [0x6F, 0xD3, 0xA8] },
  { slot: 'savings-4', rgb: [0x5D, 0xA9, 0xE9] },
  { slot: 'savings-5', rgb: [0x6B, 0x5B, 0xFF] },
  { slot: 'savings-6', rgb: [0xF0, 0x9E, 0xBB] },
  { slot: 'savings-7', rgb: [0xC9, 0x72, 0x59] },
  { slot: 'savings-8', rgb: [0x7E, 0x8C, 0x99] },
]

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace(/^#/, '')
  if (m.length !== 6) return null
  const n = parseInt(m, 16)
  if (isNaN(n)) return null
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function closestSlot(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'savings-1' // fallback razonable
  let bestSlot = REFERENCE_PALETTE[0].slot
  let bestDist = Number.POSITIVE_INFINITY
  for (const entry of REFERENCE_PALETTE) {
    const [r, g, b] = entry.rgb
    const d = (rgb[0] - r) ** 2 + (rgb[1] - g) ** 2 + (rgb[2] - b) ** 2
    if (d < bestDist) {
      bestDist = d
      bestSlot = entry.slot
    }
  }
  return bestSlot
}

function isSlot(value: string): boolean {
  if (!value.startsWith('savings-')) return false
  const n = parseInt(value.slice('savings-'.length), 10)
  return Number.isInteger(n) && n >= 1 && n <= SLOT_COUNT
}

/** Convierte cualquier hex residual en `savings_accounts.color` a un slot. */
export function migrateSavingsHexToSlots(): void {
  const db = getDatabase()
  const stmt = db.prepare('SELECT id, color FROM savings_accounts WHERE color IS NOT NULL')
  const updates: { id: string; slot: string }[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: string; color: string }
    const color = String(row.color).trim()
    if (!color || isSlot(color)) continue
    const lower = color.toLowerCase()
    const slot = KNOWN_HEX_TO_SLOT[lower] ?? closestSlot(lower)
    updates.push({ id: String(row.id), slot })
  }
  stmt.free()

  if (updates.length === 0) return

  for (const u of updates) {
    db.run('UPDATE savings_accounts SET color = ? WHERE id = ?', [u.slot, u.id])
  }
  saveDatabase()
}
