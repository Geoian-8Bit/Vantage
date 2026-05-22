import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BalanceSummary } from '@/features/transactions/ui/BalanceSummary'

describe('BalanceSummary', () => {
  it('muestra ingresos, gastos y balance formateados', () => {
    render(<BalanceSummary totalIncome={2000} totalExpenses={1200} balance={800} />)
    expect(screen.getAllByText('Ingresos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Gastos').length).toBeGreaterThan(0)
    // El balance vive en una pieza con prefijo "+", tomamos el texto crudo.
    expect(screen.getByTitle('+800,00 €')).toBeInTheDocument()
    expect(screen.getByTitle('2.000,00 €')).toBeInTheDocument()
    expect(screen.getByTitle('1.200,00 €')).toBeInTheDocument()
  })

  it('cuando el balance es negativo no añade el prefijo "+" y aplica color de gasto', () => {
    render(<BalanceSummary totalIncome={500} totalExpenses={900} balance={-400} />)
    const negativeBalance = screen.getByTitle('-400,00 €')
    expect(negativeBalance).toBeInTheDocument()
    expect(negativeBalance.className).toMatch(/text-expense/)
  })

  it('muestra la tarjeta "De meses anteriores" cuando showCarryover está activo', () => {
    render(
      <BalanceSummary
        totalIncome={1000}
        totalExpenses={500}
        balance={500}
        carryover={200}
        showCarryover
      />
    )
    expect(screen.getAllByText('De meses anteriores').length).toBeGreaterThan(0)
    // Disponible total = balance + carryover = 700
    expect(screen.getByTitle('+700,00 €')).toBeInTheDocument()
  })

  it('cuando showCarryover está apagado, el balance NO suma el carryover', () => {
    render(
      <BalanceSummary
        totalIncome={1000}
        totalExpenses={500}
        balance={500}
        carryover={9999}
      />
    )
    // Sigue mostrando 500, no 10499.
    expect(screen.getByTitle('+500,00 €')).toBeInTheDocument()
    expect(screen.queryByText('De meses anteriores')).not.toBeInTheDocument()
  })
})
