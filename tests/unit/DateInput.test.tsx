import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DateInput } from '@/components/ui/DateInput'

describe('DateInput (variant=date)', () => {
  it('muestra placeholder cuando value está vacío', () => {
    render(
      <DateInput value="" onChange={() => {}} placeholder="Elige fecha" ariaLabel="Fecha" />
    )
    expect(screen.getByRole('button', { name: 'Fecha' })).toHaveTextContent('Elige fecha')
  })

  it('formatea YYYY-MM-DD a dd/mm/yyyy en el trigger', () => {
    render(<DateInput value="2026-05-22" onChange={() => {}} ariaLabel="Fecha" />)
    expect(screen.getByRole('button', { name: 'Fecha' })).toHaveTextContent('22/05/2026')
  })

  it('abre el calendario al hacer click y muestra el mes correcto', async () => {
    const user = userEvent.setup()
    render(<DateInput value="2026-05-22" onChange={() => {}} ariaLabel="Fecha" />)
    await user.click(screen.getByRole('button', { name: 'Fecha' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Mayo 2026')).toBeInTheDocument()
  })

  it('seleccionar un día emite onChange con YYYY-MM-DD y cierra', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="2026-05-22" onChange={onChange} ariaLabel="Fecha" />)
    await user.click(screen.getByRole('button', { name: 'Fecha' }))
    await user.click(screen.getByRole('button', { name: '15' }))
    expect(onChange).toHaveBeenCalledWith('2026-05-15')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el botón "Limpiar" emite onChange con ""', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="2026-05-22" onChange={onChange} ariaLabel="Fecha" />)
    await user.click(screen.getByRole('button', { name: 'Fecha' }))
    await user.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})

describe('DateInput (variant=month)', () => {
  it('formatea YYYY-MM como "Mes YYYY"', () => {
    render(
      <DateInput value="2026-05" onChange={() => {}} variant="month" ariaLabel="Mes" />
    )
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveTextContent('Mayo 2026')
  })

  it('al elegir un mes emite onChange con YYYY-MM', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="2026-05" onChange={onChange} variant="month" ariaLabel="Mes" />)
    await user.click(screen.getByRole('button', { name: 'Mes' }))
    await user.click(screen.getByRole('button', { name: 'Mar' }))
    expect(onChange).toHaveBeenCalledWith('2026-03')
  })
})
