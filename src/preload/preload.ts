import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'

const api = {
  transactions: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_GET_ALL),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_CREATE, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_DELETE, { id }),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_UPDATE, { id, data })
  },
  categories: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET_ALL),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_CREATE, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DELETE, { id }),
    update: (id: string, name: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, { id, name })
  },
  fileio: {
    openFileDialog: (opts: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE, opts),
    exportTransactionsExcel: (payload: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_TRANSACTIONS_EXCEL, payload),
    parseExcel: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PARSE_EXCEL, filePath),
    getAccessTables: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_ACCESS_TABLES, filePath),
    parseAccess: (filePath: string, tableName: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PARSE_ACCESS, { filePath, tableName }),
    commitImport: (payload: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_COMMIT, payload),
  }
}

contextBridge.exposeInMainWorld('api', api)
