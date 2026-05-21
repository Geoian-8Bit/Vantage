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
 * Resuelve el campo `color` de un apartado a un valor CSS válido.
 * Slot conocido → var(--savings-N). Hex literal → tal cual. Null → brand.
 */
export function resolveSavingsColor(value: string | null | undefined): string {
  if (!value) return 'var(--color-brand)'
  if (isSavingsSlot(value)) return `var(--${value})`
  return value
}
