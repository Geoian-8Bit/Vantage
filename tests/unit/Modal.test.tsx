import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Hola">
        contenido
      </Modal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza un dialog accesible con título y contenido', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Crear deuda">
        <p>cuerpo del modal</p>
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Crear deuda' })).toBeInTheDocument()
    expect(screen.getByText('cuerpo del modal')).toBeInTheDocument()
  })

  it('llama onClose al pulsar Escape cuando no hay cambios', async () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Cerrable">
        contenido
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('con dirty=true, Escape abre primero la confirmación de descartar', async () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Editando" dirty>
        formulario
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Descartar cambios')).toBeInTheDocument()
  })

  it('"Seguir editando" cancela el descarte sin llamar a onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Editando" dirty>
        formulario
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('"Descartar" confirma y llama a onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Editando" dirty>
        formulario
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('botón de cerrar (la X) dispara la misma lógica de requestClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Cerrable">
        contenido
      </Modal>
    )
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
