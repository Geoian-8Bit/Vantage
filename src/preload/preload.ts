import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC_CHANNELS,
  type CreateTransactionDTO,
  type UpdateTransactionDTO,
  type CreateCategoryDTO,
  type CreateSavingsAccountDTO,
  type UpdateSavingsAccountDTO,
  type CreateDebtDTO,
  type UpdateDebtDTO,
  type ExtraPaymentDTO,
  type CreateRecurringTemplateDTO,
  type ImportCommitPayload,
  type PDFExportPayload,
} from '../shared/types'

const api = {
  transactions: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_GET_ALL),
    create: (data: CreateTransactionDTO) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_CREATE, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_DELETE, { id }),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_BULK_DELETE, { ids }),
    update: (id: string, data: UpdateTransactionDTO) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_UPDATE, { id, data }),
  },
  categories: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET_ALL),
    create: (data: CreateCategoryDTO) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_CREATE, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DELETE, { id }),
    update: (id: string, name: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, { id, name }),
  },
  savings: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SAVINGS_GET_ALL),
    create: (data: CreateSavingsAccountDTO) => ipcRenderer.invoke(IPC_CHANNELS.SAVINGS_CREATE, data),
    update: (id: string, data: UpdateSavingsAccountDTO) => ipcRenderer.invoke(IPC_CHANNELS.SAVINGS_UPDATE, { id, data }),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SAVINGS_DELETE, { id }),
  },
  debts: {
    getAll: (filter: 'active' | 'archived' | 'all' = 'all') =>
      ipcRenderer.invoke(IPC_CHANNELS.DEBTS_GET_ALL, { filter }),
    create: (data: CreateDebtDTO) => ipcRenderer.invoke(IPC_CHANNELS.DEBTS_CREATE, data),
    update: (id: string, data: UpdateDebtDTO) =>
      ipcRenderer.invoke(IPC_CHANNELS.DEBTS_UPDATE, { id, data }),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DEBTS_DELETE, { id }),
    extraPayment: (payload: ExtraPaymentDTO) =>
      ipcRenderer.invoke(IPC_CHANNELS.DEBTS_EXTRA_PAYMENT, payload),
  },
  fileio: {
    openFileDialog: (opts: { filters: { name: string; extensions: string[] }[]; title?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE, opts),
    exportTransactionsExcel: (payload: { buffer: string; defaultPath: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_TRANSACTIONS_EXCEL, payload),
    parseExcel: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PARSE_EXCEL, filePath),
    getAccessTables: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_ACCESS_TABLES, filePath),
    parseAccess: (filePath: string, tableName: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PARSE_ACCESS, { filePath, tableName }),
    commitImport: (payload: ImportCommitPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_COMMIT, payload),
    exportPDF: (payload: PDFExportPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_PDF, payload),
  },
  recurring: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.RECURRING_GET_ALL),
    create: (data: CreateRecurringTemplateDTO) => ipcRenderer.invoke(IPC_CHANNELS.RECURRING_CREATE, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.RECURRING_DELETE, { id }),
    toggle: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.RECURRING_TOGGLE, { id }),
    process: () => ipcRenderer.invoke(IPC_CHANNELS.RECURRING_PROCESS),
  },
  dashboard: {
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_STATS),
  },
  database: {
    backup: () => ipcRenderer.invoke(IPC_CHANNELS.DB_BACKUP),
    restore: () => ipcRenderer.invoke(IPC_CHANNELS.DB_RESTORE),
  },
  app: {
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),
  },
}

contextBridge.exposeInMainWorld('api', api)
