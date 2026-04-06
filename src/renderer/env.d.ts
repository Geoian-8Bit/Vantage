declare module '*.png' {
  const src: string
  export default src
}

import type {
  Transaction, CreateTransactionDTO, UpdateTransactionDTO,
  Category, CreateCategoryDTO,
  ImportFilePreview, ImportCommitPayload, ImportCommitResult,
  RecurringTemplate, CreateRecurringTemplateDTO,
  DashboardStats, BackupResult, RestoreResult,
  PDFExportPayload,
} from '../shared/types'

declare global {
  interface Window {
    api: {
      transactions: {
        getAll(): Promise<Transaction[]>
        create(data: CreateTransactionDTO): Promise<Transaction>
        delete(id: string): Promise<void>
        bulkDelete(ids: string[]): Promise<number>
        update(id: string, data: UpdateTransactionDTO): Promise<Transaction>
      }
      categories: {
        getAll(): Promise<Category[]>
        create(data: CreateCategoryDTO): Promise<Category>
        delete(id: string): Promise<void>
        update(id: string, name: string): Promise<Category>
      }
      fileio: {
        openFileDialog(opts: { filters: { name: string; extensions: string[] }[]; title?: string }): Promise<string | null>
        exportTransactionsExcel(payload: { buffer: string; defaultPath: string }): Promise<void>
        parseExcel(filePath: string): Promise<ImportFilePreview>
        getAccessTables(filePath: string): Promise<{ tables: string[] }>
        parseAccess(filePath: string, tableName: string): Promise<ImportFilePreview>
        commitImport(payload: ImportCommitPayload): Promise<ImportCommitResult>
        exportPDF(payload: PDFExportPayload): Promise<void>
      }
      recurring: {
        getAll(): Promise<RecurringTemplate[]>
        create(data: CreateRecurringTemplateDTO): Promise<RecurringTemplate>
        delete(id: string): Promise<void>
        toggle(id: string): Promise<RecurringTemplate>
        process(): Promise<{ count: number }>
      }
      dashboard: {
        getStats(): Promise<DashboardStats>
      }
      database: {
        backup(): Promise<BackupResult>
        restore(): Promise<RestoreResult>
      }
      app: {
        quit(): Promise<void>
      }
    }
  }
}
