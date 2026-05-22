import { describe, expect, it } from 'vitest'
import {
  addMonths,
  averageMonthlyCapacity,
  evaluateProposal,
  monthsForQuota,
  prettyMonth,
  quotaForMonths,
  recommendPlans,
  scenarios,
} from '@/lib/utils/debtMath'

describe('monthsForQuota', () => {
  it('redondea hacia arriba el número de meses', () => {
    expect(monthsForQuota(1000, 300)).toBe(4)
  })

  it('devuelve 0 cuando el capital es prácticamente cero', () => {
    expect(monthsForQuota(0, 100)).toBe(0)
    expect(monthsForQuota(0.004, 100)).toBe(0)
  })

  it('lanza si la cuota es cero o negativa', () => {
    expect(() => monthsForQuota(1000, 0)).toThrow()
    expect(() => monthsForQuota(1000, -10)).toThrow()
  })
})

describe('quotaForMonths', () => {
  it('reparte el capital entre los meses indicados', () => {
    expect(quotaForMonths(1200, 12)).toBeCloseTo(100)
  })

  it('lanza si los meses son cero o negativos', () => {
    expect(() => quotaForMonths(1000, 0)).toThrow()
  })
})

describe('addMonths', () => {
  it('suma meses dentro del mismo año', () => {
    expect(addMonths('2026-01-15', 3)).toBe('2026-04-15')
  })

  it('cruza el año correctamente', () => {
    expect(addMonths('2026-11-10', 3)).toBe('2027-02-10')
  })

  it('ajusta el día cuando el destino no tiene ese día (31 enero + 1 mes = 28/29 feb)', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
  })

  it('admite n negativo', () => {
    expect(addMonths('2026-03-15', -2)).toBe('2026-01-15')
  })
})

describe('prettyMonth', () => {
  it('formatea YYYY-MM-DD a "Mes YYYY" en español', () => {
    expect(prettyMonth('2026-05-01')).toBe('Mayo 2026')
    expect(prettyMonth('2026-12-31')).toBe('Diciembre 2026')
  })
})

describe('scenarios', () => {
  it('devuelve un escenario por cada plazo de la lista', () => {
    const result = scenarios(1200, '2026-01-01', [6, 12])
    expect(result).toHaveLength(2)
    expect(result[0]?.months).toBe(6)
    expect(result[0]?.quota).toBeCloseTo(200)
    expect(result[1]?.months).toBe(12)
    expect(result[1]?.quota).toBeCloseTo(100)
  })
})

describe('averageMonthlyCapacity', () => {
  it('promedia neto de meses con actividad', () => {
    const cap = averageMonthlyCapacity([
      { month: '2026-01', income: 2000, expenses: 1500 },
      { month: '2026-02', income: 2200, expenses: 1700 },
    ])
    expect(cap).toBeCloseTo(500)
  })

  it('ignora meses totalmente vacíos', () => {
    const cap = averageMonthlyCapacity([
      { month: '2026-01', income: 0, expenses: 0 },
      { month: '2026-02', income: 1000, expenses: 600 },
    ])
    expect(cap).toBeCloseTo(400)
  })

  it('devuelve 0 si no hay meses con actividad', () => {
    expect(averageMonthlyCapacity([])).toBe(0)
    expect(
      averageMonthlyCapacity([{ month: '2026-01', income: 0, expenses: 0 }])
    ).toBe(0)
  })
})

describe('evaluateProposal', () => {
  it('marca ok cuando la cuota deja >=40% de margen sobre la capacidad', () => {
    const r = evaluateProposal(1200, 100, 1000)
    expect(r.severity).toBe('ok')
    expect(r.margin).toBeCloseTo(900)
  })

  it('marca tight cuando el margen es positivo pero ajustado', () => {
    const r = evaluateProposal(1200, 800, 1000)
    expect(r.severity).toBe('tight')
  })

  it('marca risk cuando la cuota supera la capacidad', () => {
    const r = evaluateProposal(1200, 1500, 1000)
    expect(r.severity).toBe('risk')
    expect(r.margin).toBeLessThan(0)
  })

  it('marca unknown cuando aún no hay histórico (capacidad <=0)', () => {
    const r = evaluateProposal(1200, 100, 0)
    expect(r.severity).toBe('unknown')
  })
})

describe('recommendPlans', () => {
  it('devuelve null si no hay capital o capacidad', () => {
    expect(recommendPlans(0, 500)).toBeNull()
    expect(recommendPlans(1000, 0)).toBeNull()
  })

  it('devuelve tres planes con cuotas decrecientes (rapido > optimo > tranquilo)', () => {
    const plans = recommendPlans(3000, 1000)
    expect(plans).not.toBeNull()
    expect(plans!.fast.quota).toBeGreaterThan(plans!.optimal.quota)
    expect(plans!.optimal.quota).toBeGreaterThan(plans!.calm.quota)
  })
})
