import { dialog } from 'electron'
import { writeFileSync, readFileSync } from 'fs'
import type { BackupResult, RestoreResult } from '../../shared/types'
import { getDatabase, replaceDatabase } from './schema'

export async function handleBackup(): Promise<BackupResult> {
  try {
    const db = getDatabase()
    const data = db.export()
    const buffer = Buffer.from(data)

    const today = new Date().toISOString().slice(0, 10)
    const result = await dialog.showSaveDialog({
      title: 'Exportar copia de seguridad',
      defaultPath: `vantage-backup-${today}.db`,
      filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }],
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelado' }
    }

    writeFileSync(result.filePath, buffer)
    return { success: true, path: result.filePath }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function handleRestore(): Promise<RestoreResult> {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Restaurar copia de seguridad',
      filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelado' }
    }

    const filePath = result.filePaths[0]
    const buffer = readFileSync(filePath)

    // Validate SQLite header
    const header = buffer.subarray(0, 16).toString('ascii')
    if (!header.startsWith('SQLite format 3')) {
      return { success: false, error: 'El archivo no es una base de datos SQLite válida.' }
    }

    await replaceDatabase(buffer)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
