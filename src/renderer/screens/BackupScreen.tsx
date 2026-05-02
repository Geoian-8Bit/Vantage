import { useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { Modal } from '../components/Modal'
import { TiltCard } from '../components/TiltCard'
import { useToast } from '../components/Toast'

interface BackupScreenProps {
  onBack: () => void
}

export function BackupScreen({ onBack }: BackupScreenProps) {
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [working, setWorking] = useState(false)
  const toast = useToast()

  async function handleBackup() {
    setWorking(true)
    try {
      const result = await window.api.database.backup()
      if (result.success) {
        toast.success('Copia guardada', result.path)
      } else if (result.error !== 'Cancelado') {
        toast.error('No se pudo guardar la copia', result.error)
      }
    } catch (err) {
      toast.error('No se pudo exportar', err instanceof Error ? err.message : undefined)
    } finally {
      setWorking(false)
    }
  }

  async function handleRestore() {
    setShowRestoreConfirm(false)
    setWorking(true)
    try {
      const result = await window.api.database.restore()
      if (result.success) {
        toast.success('Base de datos restaurada', 'Recargando la aplicación…')
        setTimeout(() => window.location.reload(), 1500)
      } else if (result.error !== 'Cancelado') {
        toast.error('No se pudo restaurar', result.error)
      }
    } catch (err) {
      toast.error('No se pudo restaurar', err instanceof Error ? err.message : undefined)
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Export */}
        <TiltCard intensity={3} className="card-anim rounded-2xl bg-card border border-border shadow-sm p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-income-light flex items-center justify-center text-income">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-text" style={{ fontFamily: 'var(--font-display)' }}>Exportar base de datos</p>
            <p className="text-xs text-subtext mt-1.5 leading-relaxed">
              Guarda una copia completa de todos tus datos (transacciones, categorías, recurrentes) en un archivo .db.
            </p>
          </div>
          <button
            onClick={handleBackup}
            disabled={working}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-income hover:bg-income-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {working ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Exportando…
              </>
            ) : 'Exportar copia'}
          </button>
        </TiltCard>

        {/* Restore */}
        <TiltCard intensity={3} className="card-anim rounded-2xl bg-card border border-border shadow-sm p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-expense-light flex items-center justify-center text-expense">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-text" style={{ fontFamily: 'var(--font-display)' }}>Restaurar base de datos</p>
            <p className="text-xs text-subtext mt-1.5 leading-relaxed">
              Reemplaza todos tus datos actuales con una copia de seguridad anterior. Esta acción no se puede deshacer.
            </p>
          </div>
          <button
            onClick={() => setShowRestoreConfirm(true)}
            disabled={working}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-expense hover:bg-expense-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {working ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Restaurando…
              </>
            ) : 'Restaurar copia'}
          </button>
        </TiltCard>
      </div>

      {/* Confirmation modal */}
      <Modal isOpen={showRestoreConfirm} onClose={() => setShowRestoreConfirm(false)} title="Restaurar copia de seguridad">
        <p className="text-sm text-subtext leading-relaxed">
          Esto reemplazará <strong className="text-text">todos tus datos actuales</strong> con los de la copia seleccionada. La acción no se puede deshacer.
        </p>
        <div className="flex gap-3 pt-5">
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
