import { useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Modal } from '../components/Modal'

interface BackupScreenProps {
  onBack: () => void
}

export function BackupScreen({ onBack }: BackupScreenProps) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [working, setWorking] = useState(false)

  async function handleBackup() {
    setWorking(true)
    setMessage(null)
    try {
      const result = await window.api.database.backup()
      if (result.success) {
        setMessage({ type: 'success', text: `Copia guardada en: ${result.path}` })
      } else if (result.error !== 'Cancelado') {
        setMessage({ type: 'error', text: result.error ?? 'Error desconocido' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setWorking(false)
    }
  }

  async function handleRestore() {
    setShowRestoreConfirm(false)
    setWorking(true)
    setMessage(null)
    try {
      const result = await window.api.database.restore()
      if (result.success) {
        setMessage({ type: 'success', text: 'Base de datos restaurada correctamente. Recargando…' })
        setTimeout(() => window.location.reload(), 1500)
      } else if (result.error !== 'Cancelado') {
        setMessage({ type: 'error', text: result.error ?? 'Error desconocido' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-4 lg:space-y-5 w-full">
      <PageHeader
        section="Ajustes"
        page="Copia de seguridad"
        actions={
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-subtext bg-surface hover:bg-border border border-border transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Volver
          </button>
        }
      />

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          message.type === 'success'
            ? 'bg-income-light border-income/20 text-income'
            : 'bg-expense-light border-expense/20 text-expense'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Export */}
        <div className="rounded-xl bg-card border border-border shadow-sm p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-income-light flex items-center justify-center text-income">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-text">Exportar base de datos</p>
            <p className="text-xs text-subtext mt-1 leading-relaxed">
              Guarda una copia completa de todos tus datos (transacciones, categorías, recurrentes) en un archivo .db.
            </p>
          </div>
          <button
            onClick={handleBackup}
            disabled={working}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-income hover:bg-income-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {working ? 'Exportando…' : 'Exportar copia'}
          </button>
        </div>

        {/* Restore */}
        <div className="rounded-xl bg-card border border-border shadow-sm p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-expense-light flex items-center justify-center text-expense">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-text">Restaurar base de datos</p>
            <p className="text-xs text-subtext mt-1 leading-relaxed">
              Reemplaza todos tus datos actuales con una copia de seguridad anterior. Esta acción no se puede deshacer.
            </p>
          </div>
          <button
            onClick={() => setShowRestoreConfirm(true)}
            disabled={working}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-expense hover:bg-expense-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {working ? 'Restaurando…' : 'Restaurar copia'}
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      <Modal isOpen={showRestoreConfirm} onClose={() => setShowRestoreConfirm(false)} title="Restaurar copia de seguridad">
        <p className="text-sm text-subtext">
          Esto reemplazará <strong className="text-text">todos tus datos actuales</strong> con los de la copia seleccionada. Esta acción no se puede deshacer.
        </p>
        <p className="text-sm text-subtext mt-2">¿Deseas continuar?</p>
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setShowRestoreConfirm(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-subtext bg-surface hover:bg-border transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleRestore}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-expense hover:bg-expense-hover transition-colors cursor-pointer"
          >
            Restaurar
          </button>
        </div>
      </Modal>
    </div>
  )
}
