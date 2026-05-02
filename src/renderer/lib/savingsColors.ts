/**
 * Slots de color para apartados de ahorro.
 *
 * El form guarda en BD un slot ('savings-1'..'savings-8') y los componentes
 * lo resuelven a la variable CSS correspondiente, que cambia con el tema activo.
 *
 * Compatibilidad: si el campo `color` contiene un hex literal (apartados creados
 * antes de migrar a slots), se devuelve tal cual.
 */

export const SAVINGS_SLOTS = [
  'savings-1',
  'savings-2',
  'savings-3',
  'savings-4',
  'savings-5',
  'savings-6',
  'savings-7',
  'savings-8',
] as const

export type SavingsSlot = (typeof SAVINGS_SLOTS)[number]

/** Etiqueta semántica genérica para cada slot — el rol que cumple en cada paleta. */
export const SAVINGS_SLOT_LABELS: Record<SavingsSlot, string> = {
  'savings-1': 'Principal',
  'savings-2': 'Acento',
  'savings-3': 'Éxito',
  'savings-4': 'Frescor',
  'savings-5': 'Información',
  'savings-6': 'Cálido',
  'savings-7': 'Tierra',
  'savings-8': 'Neutro',
}

export function isSavingsSlot(value: string | null | undefined): value is SavingsSlot {
  if (!value) return false
  return (SAVINGS_SLOTS as readonly string[]).includes(value)
}

/**
 * Devuelve un valor CSS válido para `background`, `color`, `color-mix`, etc.
 * - Slots conocidos → `var(--savings-N)` (se adapta al tema)
 * - Hex u otro string → se devuelve tal cual (apartados antiguos)
 * - Null/undefined → fallback al brand del tema
 */
export function resolveSavingsColor(value: string | null | undefined): string {
  if (!value) return 'var(--color-brand)'
  if (isSavingsSlot(value)) return `var(--${value})`
  return value
}
