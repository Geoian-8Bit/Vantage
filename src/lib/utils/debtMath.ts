import { MONTH_NAMES_FULL } from './format'

const EPS = 0.005

/** Meses necesarios para amortizar `capital` con cuota mensual `quota`. */
export function monthsForQuota(capital: number, quota: number): number {
  if (capital <= EPS) return 0
  if (!isFinite(quota) || quota <= 0) throw new Error('La cuota debe ser mayor que 0')
  return Math.ceil(capital / quota)
}

/** Cuota mensual necesaria para amortizar `capital` en `months` meses. */
export function quotaForMonths(capital: number, months: number): number {
  if (capital <= EPS) return 0
  if (!isFinite(months) || months <= 0) throw new Error('Los meses deben ser mayores que 0')
  return capital / months
}

export interface Scenario {
  months: number
  quota: number
  endDate: string
  endLabel: string
}

export function scenarios(
  capital: number,
  startDate: string,
  monthsList: number[] = [3, 6, 9, 12, 18, 24, 36]
): Scenario[] {
  return monthsList.map((months) => {
    const quota = quotaForMonths(capital, months)
    const endDate = addMonths(startDate, months - 1)
    return { months, quota, endDate, endLabel: prettyMonth(endDate) }
  })
}

/** Avanza una fecha YYYY-MM-DD `n` meses. Maneja desbordes (31-ene + 1 = 28/29-feb). */
export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1 + n, d!, 12, 0, 0))
  const targetMonth = (m! - 1 + n) % 12
  const normalized = ((targetMonth % 12) + 12) % 12
  if (dt.getUTCMonth() !== normalized) {
    dt.setUTCDate(0)
  }
  return dt.toISOString().slice(0, 10)
}

export function prettyMonth(date: string): string {
  const [y, m] = date.split('-').map(Number)
  return `${MONTH_NAMES_FULL[m! - 1]} ${y}`
}

export function averageMonthlyCapacity(
  monthlyTrend: { month: string; income: number; expenses: number }[]
): number {
  const useful = monthlyTrend.filter((m) => m.income > 0 || m.expenses > 0)
  if (useful.length === 0) return 0
  const totalNet = useful.reduce((acc, m) => acc + (m.income - m.expenses), 0)
  return totalNet / useful.length
}

export interface Recommendation {
  quota: number
  months: number
  margin: number
  severity: 'ok' | 'tight' | 'risk' | 'unknown'
  hint: string
}

export function evaluateProposal(
  capital: number,
  quota: number,
  monthlyCapacity: number
): Recommendation {
  const months = quota > 0 ? monthsForQuota(capital, quota) : 0
  if (monthlyCapacity <= 0) {
    return {
      quota,
      months,
      margin: 0,
      severity: 'unknown',
      hint: 'Aún no tenemos suficiente histórico para estimar tu capacidad de ahorro mensual.',
    }
  }
  const margin = monthlyCapacity - quota
  if (margin >= monthlyCapacity * 0.4) {
    return {
      quota,
      months,
      margin,
      severity: 'ok',
      hint: 'La cuota cabe holgadamente en tu capacidad media.',
    }
  }
  if (margin >= 0) {
    return {
      quota,
      months,
      margin,
      severity: 'tight',
      hint: 'La cuota es asumible pero te dejará poco margen.',
    }
  }
  return {
    quota,
    months,
    margin,
    severity: 'risk',
    hint: 'La cuota supera tu capacidad media de ahorro: revisa el plazo o el plan.',
  }
}

export function recommendPlans(
  capital: number,
  monthlyCapacity: number
): { fast: Recommendation; optimal: Recommendation; calm: Recommendation } | null {
  if (capital <= EPS || monthlyCapacity <= 0) return null

  const make = (ratio: number): Recommendation => {
    const targetQuota = Math.max(1, monthlyCapacity * ratio)
    const months = monthsForQuota(capital, targetQuota)
    const effectiveQuota = months > 0 ? quotaForMonths(capital, months) : 0
    return evaluateProposal(capital, effectiveQuota, monthlyCapacity)
  }

  return {
    fast: make(0.85),
    optimal: make(0.6),
    calm: make(0.4),
  }
}
