export interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string // YYYY-MM-DD
  category: string
  created_at: string // ISO timestamp
}

export interface CreateTransactionDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category: string
}

export interface UpdateTransactionDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category: string
}

export const CATEGORIES = {
  expense: ['Alimentación', 'Transporte', 'Alquiler', 'Ocio', 'Salud', 'Ropa', 'Servicios', 'Otros'] as const,
  income: ['Nómina', 'Bizum', 'Regalo', 'Inversión'] as const,
} as const

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
}

export interface CreateCategoryDTO {
  name: string
  type: 'income' | 'expense'
}

export const IPC_CHANNELS = {
  TRANSACTIONS_GET_ALL: 'db:transactions:getAll',
  TRANSACTIONS_CREATE: 'db:transactions:create',
  TRANSACTIONS_DELETE: 'db:transactions:delete',
  TRANSACTIONS_UPDATE: 'db:transactions:update',
  CATEGORIES_GET_ALL: 'db:categories:getAll',
  CATEGORIES_CREATE: 'db:categories:create',
  CATEGORIES_DELETE: 'db:categories:delete',
  CATEGORIES_UPDATE: 'db:categories:update',
  // File I/O
  DIALOG_OPEN_FILE:          'dialog:openFile',
  EXPORT_TRANSACTIONS_EXCEL: 'fs:export:transactionsExcel',
  IMPORT_PARSE_EXCEL:        'fs:import:parseExcel',
  IMPORT_ACCESS_TABLES:      'fs:import:accessTables',
  IMPORT_PARSE_ACCESS:       'fs:import:parseAccess',
  IMPORT_COMMIT:             'db:import:commit',
} as const

// ── Import / Export types ──────────────────────────────────────────────────

/** One raw row read from an external file, before mapping. Values are always strings. */
export interface RawImportRow {
  [columnHeader: string]: string
}

/** Parsed file preview: all rows + column headers */
export interface ImportFilePreview {
  columns:    string[]
  rows:       RawImportRow[]  // ALL rows (personal finance files are small)
  totalRows:  number
  tableName?: string          // Access only
}

/** User's column mapping decision */
export interface ColumnMapping {
  amount:      string | null  // required
  type:        string | null  // required
  date:        string | null  // required
  description: string | null  // optional
  category:    string | null  // optional
}

export interface ImportValidationResult {
  validRows:   CreateTransactionDTO[]
  invalidRows: InvalidImportRow[]
}

export interface InvalidImportRow {
  rowIndex: number
  rawRow:   RawImportRow
  reason:   string
}

export interface ImportCommitPayload { rows: CreateTransactionDTO[] }
export interface ImportCommitResult  { inserted: number; errors: string[] }
