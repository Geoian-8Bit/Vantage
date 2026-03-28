import type {
  Transaction, CreateTransactionDTO, UpdateTransactionDTO,
  Category, CreateCategoryDTO,
  ImportFilePreview, ImportCommitPayload, ImportCommitResult,
} from '../shared/types'

declare global {
  interface Window {
    api: {
      transactions: {
        getAll(): Promise<Transaction[]>
        create(data: CreateTransactionDTO): Promise<Transaction>
        delete(id: string): Promise<void>
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
      }
    }
  }
}
