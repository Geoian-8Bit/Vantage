export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function pad(n: number): string { return String(n).padStart(2, '0') }

export const MONTH_NAMES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export const MONTH_NAMES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_NAMES_SHORT[m - 1]} ${String(y).slice(2)}`
}

export const FREQ_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual',
}

export const FREQ_COLORS: Record<string, string> = {
  weekly: 'bg-brand-light text-brand',
  monthly: 'bg-income-light text-income',
  quarterly: 'bg-expense-light text-expense',
  annual: 'bg-surface text-subtext border border-border',
}
