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
  type SaveShoppingSettingsDTO,
  type CreateShoppingListDTO,
  type UpdateShoppingListDTO,
  type AddShoppingEntryDTO,
  type UpdateShoppingEntryDTO,
  type SupermarketId,
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
  shopping: {
    settings: {
      get:  () => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_SETTINGS_GET),
      save: (data: SaveShoppingSettingsDTO & { seeded_at?: string | null }) =>
        ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_SETTINGS_SAVE, data),
    },
    items: {
      getAll: (filter?: { category?: string; query?: string }) =>
        ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_ITEMS_GET_ALL, { filter }),
      get:    (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_ITEMS_GET, { id }),
      history:(id: string) => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_ITEMS_HISTORY, { id }),
      create: (payload: {
        id?: string
        name: string
        brand?: string | null
        category: string
        format?: string | null
        image_url?: string | null
        skus?: Array<{ supermarket: SupermarketId; sku: string; product_name: string; product_url?: string | null; image_url?: string | null }>
      }) => ipcRenderer.invoke('db:shopping:items:create', payload),
      setTracked: (id: string, tracked: boolean) =>
        ipcRenderer.invoke('db:shopping:items:setTracked', { id, tracked }),
      clearAll: () => ipcRenderer.invoke('db:shopping:items:clearAll'),
    },
    snapshots: {
      addBulk: (snapshots: Array<{
        supermarket: SupermarketId
        sku: string
        postal_code?: string | null
        price: number
        unit_price?: number | null
        in_stock?: boolean
        captured_at: string
      }>) => ipcRenderer.invoke('db:shopping:snapshots:addBulk', { snapshots }),
    },
    lists: {
      getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_LISTS_GET_ALL),
      get:    (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_LISTS_GET, { id }),
      create: (data: CreateShoppingListDTO) => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_LISTS_CREATE, data),
      update: (id: string, data: UpdateShoppingListDTO) =>
        ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_LISTS_UPDATE, { id, data }),
      delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_LISTS_DELETE, { id }),
    },
    entries: {
      add:    (data: AddShoppingEntryDTO) => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_ENTRY_ADD, data),
      update: (id: string, data: UpdateShoppingEntryDTO) =>
        ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_ENTRY_UPDATE, { id, data }),
      remove: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_ENTRY_REMOVE, { id }),
      clear:  (listId: string) => ipcRenderer.invoke(IPC_CHANNELS.SHOPPING_ENTRY_CLEAR, { listId }),
    },
    scrape: {
      search: (payload: { query: string; supers?: SupermarketId[]; limit?: number; postalCode?: string | null }) =>
        ipcRenderer.invoke('db:shopping:scrape:search', payload),
      refreshTracked: (payload?: { postalCode?: string | null }) =>
        ipcRenderer.invoke('db:shopping:scrape:refreshTracked', payload ?? {}),
      linkSku: (payload: { itemId: string; supermarket: SupermarketId; sku: string; product_name: string; product_url?: string | null; image_url?: string | null }) =>
        ipcRenderer.invoke('db:shopping:items:linkSku', payload),
      validatePostalCode: (postalCode: string) =>
        ipcRenderer.invoke('db:shopping:scrape:validatePostalCode', { postalCode }),
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
