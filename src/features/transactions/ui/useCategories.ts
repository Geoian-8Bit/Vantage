'use client'

/**
 * Lista provisional de categorías hasta que migremos la slice Categories
 * (Sub-fase 5.2). Devuelve los mismos defaults que tenía el SQLite del Electron.
 */

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'exp-alimentacion', name: 'Alimentación', type: 'expense' },
  { id: 'exp-transporte', name: 'Transporte', type: 'expense' },
  { id: 'exp-alquiler', name: 'Alquiler', type: 'expense' },
  { id: 'exp-ocio', name: 'Ocio', type: 'expense' },
  { id: 'exp-salud', name: 'Salud', type: 'expense' },
  { id: 'exp-ropa', name: 'Ropa', type: 'expense' },
  { id: 'exp-servicios', name: 'Servicios', type: 'expense' },
  { id: 'exp-otros', name: 'Otros', type: 'expense' },
  { id: 'inc-nomina', name: 'Nómina', type: 'income' },
  { id: 'inc-bizum', name: 'Bizum', type: 'income' },
  { id: 'inc-regalo', name: 'Regalo', type: 'income' },
  { id: 'inc-inversion', name: 'Inversión', type: 'income' },
]

export function useCategories() {
  return {
    categories: DEFAULT_CATEGORIES,
    loading: false,
    error: null as Error | null,
  }
}
