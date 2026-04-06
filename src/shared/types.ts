export interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string // YYYY-MM-DD
  category: string
  created_at: string // ISO timestamp
  note?: string
}

export interface CreateTransactionDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category: string
  note?: string
}

export interface UpdateTransactionDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category: string
  note?: string
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
}

export interface CreateCategoryDTO {
  name: string
  type: 'income' | 'expense'
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardStats {
  balance: number
  monthExpenses: number
  prevMonthExpenses: number
  monthExpenseChange: number // percentage
  topCategory: { name: string; amount: number } | null
  upcomingRecurring: RecurringTemplate[]
  monthlyTrend: { month: string; income: number; expenses: number }[]
}

// ── PDF Export ─────────────────────────────────────────────────────────────
export interface PDFExportPayload {
  title: string
  period: string
  income: number
  expenses: number
  balance: number
  categories: { name: string; amount: number; percent: number }[]
  transactions: { date: string; description: string; category: string; amount: number; type: 'income' | 'expense' }[]
}

// ── Backup / Restore ──────────────────────────────────────────────────────
export interface BackupResult  { success: boolean; path?: string; error?: string }
export interface RestoreResult { success: boolean; error?: string }

export const IPC_CHANNELS = {
  TRANSACTIONS_GET_ALL: 'db:transactions:getAll',
  TRANSACTIONS_CREATE: 'db:transactions:create',
  TRANSACTIONS_DELETE: 'db:transactions:delete',
  TRANSACTIONS_UPDATE: 'db:transactions:update',
  TRANSACTIONS_BULK_DELETE: 'db:transactions:bulkDelete',
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
  // Recurring
  RECURRING_GET_ALL: 'db:recurring:getAll',
  RECURRING_CREATE:  'db:recurring:create',
  RECURRING_DELETE:  'db:recurring:delete',
  RECURRING_TOGGLE:  'db:recurring:toggle',
  RECURRING_PROCESS: 'db:recurring:process',
  // Dashboard
  DASHBOARD_STATS: 'db:dashboard:stats',
  // PDF Export
  EXPORT_PDF: 'fs:export:pdf',
  // Backup
  DB_BACKUP:  'db:backup',
  DB_RESTORE: 'db:restore',
  // App
  APP_QUIT: 'app:quit',
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

// ── Recurring templates ────────────────────────────────────────────────────

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual'

export interface RecurringTemplate {
  id: string
  amount: number
  type: 'income' | 'expense'
  description: string
  category: string
  frequency: RecurringFrequency
  next_date: string   // YYYY-MM-DD — next due date
  active: boolean
  created_at: string
}

export interface CreateRecurringTemplateDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  category: string
  frequency: RecurringFrequency
  start_date: string  // YYYY-MM-DD — first registration date
}
