import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Select, type SelectOption } from '@/components/ui/Select'

const options: SelectOption[] = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'all', label: 'Todos' },
]

describe('Select', () => {
  it('muestra el placeholder cuando no hay value seleccionado', () => {
    render(
      <Select value="" onChange={() => {}} options={options} placeholder="Elige tipo" />
    )
    expect(screen.getByRole('button', { name: /Elige tipo/i })).toBeInTheDocument()
  })

  it('muestra la label del value actual', () => {
    render(<Select value="expense" onChange={() => {}} options={options} />)
    expect(screen.getByRole('button', { name: /Gasto/i })).toBeInTheDocument()
  })

  it('abre el popover al hacer click y lista las opciones', async () => {
    const user = userEvent.setup()
    render(<Select value="income" onChange={() => {}} options={options} ariaLabel="Tipo" />)
    await user.click(screen.getByRole('button', { name: /Tipo/i }))
    const listbox = await screen.findByRole('listbox')
    expect(listbox).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Ingreso' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('option', { name: 'Gasto' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('al elegir una opción dispara onChange con su value y cierra el popover', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select value="income" onChange={onChange} options={options} ariaLabel="Tipo" />)
    await user.click(screen.getByRole('button', { name: /Tipo/i }))
    await user.click(screen.getByRole('option', { name: 'Gasto' }))
    expect(onChange).toHaveBeenCalledWith('expense')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
