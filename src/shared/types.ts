export interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string // YYYY-MM-DD
  category: string
  created_at: string // ISO timestamp
  note?: string
  /** ID del apartado de ahorro al que afecta. Si está presente:
   *  - type='expense' = aportación al apartado (sale del profit, suma al apartado)
   *  - type='income'  = retirada del apartado (entra al profit, resta del apartado)
   */
  savings_account_id?: string | null
  /** ID de la deuda a la que se aplica esta transacción (cuota mensual o pago extra). */
  debt_id?: string | null
}

export interface CreateTransactionDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category: string
  note?: string
  savings_account_id?: string | null
  debt_id?: string | null
}

export interface UpdateTransactionDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  date: string
  category: string
  note?: string
  savings_account_id?: string | null
  debt_id?: string | null
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

// ── Ahorros (apartados / sub-cuentas) ─────────────────────────────────────
/** Nombre reservado de la categoría que se asigna automáticamente a las
 *  transacciones que van/vienen de un apartado de ahorro. */
export const SAVINGS_CATEGORY_NAME = 'Ahorro'

export interface SavingsAccount {
  id: string
  name: string
  /** Color HEX opcional para diferenciar visualmente el apartado */
  color: string | null
  /** Meta opcional en la misma moneda que el resto. null = sin meta */
  target_amount: number | null
  created_at: string
  /** Saldo calculado en backend: SUM(expenses) - SUM(incomes) ligados a este apartado */
  balance: number
}

export interface CreateSavingsAccountDTO {
  name: string
  color?: string | null
  target_amount?: number | null
}

export interface UpdateSavingsAccountDTO {
  name: string
  color?: string | null
  target_amount?: number | null
}

// ── Deudas ────────────────────────────────────────────────────────────────
/** Nombre reservado de la categoría asignada automáticamente a las
 *  transacciones que pagan una deuda (cuota recurrente o pago extra). */
export const DEBT_CATEGORY_NAME = 'Deuda'

export interface Debt {
  id: string
  name: string
  /** A quién se debe — opcional (banco, persona, comercio...) */
  creditor: string | null
  /** Slot de color (savings-1..savings-8) */
  color: string | null
  /** Capital total de la deuda al momento de crearla */
  initial_amount: number
  /** Cuota mensual fija */
  monthly_amount: number
  /** Fecha YYYY-MM-DD de la primera cuota */
  start_date: string
  /** Id del recurring_template asociado (creado automáticamente) */
  recurring_id: string | null
  /** YYYY-MM-DD si la deuda está saldada/archivada; null = activa */
  archived_at: string | null
  notes: string | null
  created_at: string
  /** Total ya pagado (suma de transacciones con debt_id = id). Calculado en backend. */
  paid: number
  /** Capital pendiente: initial_amount - paid (no negativo). Calculado en backend. */
  pending: number
  /** Meses restantes estimados: ceil(pending / monthly_amount). Calculado en backend. */
  months_remaining: number
}

export interface CreateDebtDTO {
  name: string
  creditor?: string | null
  color?: string | null
  initial_amount: number
  monthly_amount: number
  start_date: string
  notes?: string | null
}

export interface UpdateDebtDTO {
  name: string
  creditor?: string | null
  color?: string | null
  initial_amount: number
  monthly_amount: number
  start_date: string
  notes?: string | null
}

export interface ExtraPaymentDTO {
  debt_id: string
  amount: number
  /** YYYY-MM-DD; por defecto hoy si no se proporciona */
  date?: string
  /** Texto opcional libre (queda en transactions.note) */
  note?: string
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
  /** Suma de saldos de todos los apartados de ahorro */
  totalSavings: number
  /** Suma del capital pendiente de todas las deudas activas */
  totalDebtPending: number
  /** Patrimonio total: balance líquido + totalSavings - totalDebtPending */
  netWorth: number
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
  // Savings (apartados / sub-cuentas de ahorro)
  SAVINGS_GET_ALL: 'db:savings:getAll',
  SAVINGS_CREATE:  'db:savings:create',
  SAVINGS_UPDATE:  'db:savings:update',
  SAVINGS_DELETE:  'db:savings:delete',
  // Debts (deudas amortizables)
  DEBTS_GET_ALL:        'db:debts:getAll',
  DEBTS_CREATE:         'db:debts:create',
  DEBTS_UPDATE:         'db:debts:update',
  DEBTS_DELETE:         'db:debts:delete',
  DEBTS_EXTRA_PAYMENT:  'db:debts:extraPayment',
  // File I/O
  DIALOG_OPEN_FILE:          'dialog:openFile',
  EXPORT_TRANSACTIONS_EXCEL: 'fs:export:transactionsExcel',
  IMPORT_PARSE_EXCEL:        'fs:import:parseExcel',
  IMPORT_ACCESS_TABLES:      'fs:import:accessTables',
  IMPORT_PARSE_ACCESS:       'fs:import:parseAccess',
  IMPORT_ACCESS_GESHOGAR_DETECT: 'fs:import:accessGeshogarDetect',
  IMPORT_ACCESS_GESHOGAR_RUN:    'fs:import:accessGeshogarRun',
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

/** Resultado de detectar si un .accdb tiene la estructura conocida de
 *  GesHogar (tablas Apuntes_Gastos / Apuntes_Ingresos / Cuentas). */
export interface AccessGeshogarPreview {
  isGeshogar:    boolean
  expenseCount:  number
  incomeCount:   number
  categoryCount: number
  /** Tablas distintas a las 3 conocidas (informativo, no se importan auto). */
  otherTables:   string[]
}

export interface AccessGeshogarRunResult {
  inserted:           number
  expensesInserted:   number
  incomesInserted:    number
  categoriesCreated:  number
  errors:             string[]
}

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
  /** Si el template materializa cuotas de una deuda, las transacciones generadas
   *  heredan este id en transactions.debt_id. */
  debt_id?: string | null
  /** Análogo para apartados de ahorro (preparado para el futuro). */
  savings_account_id?: string | null
}

export interface CreateRecurringTemplateDTO {
  amount: number
  type: 'income' | 'expense'
  description: string
  category: string
  frequency: RecurringFrequency
  start_date: string  // YYYY-MM-DD — first registration date
  debt_id?: string | null
  savings_account_id?: string | null
}
