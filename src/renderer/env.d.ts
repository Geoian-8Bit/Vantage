declare module '*.png' {
  const src: string
  export default src
}

import type {
  Transaction, CreateTransactionDTO, UpdateTransactionDTO,
  Category, CreateCategoryDTO,
  SavingsAccount, CreateSavingsAccountDTO, UpdateSavingsAccountDTO,
  Debt, CreateDebtDTO, UpdateDebtDTO, ExtraPaymentDTO,
  ImportFilePreview, ImportCommitPayload, ImportCommitResult,
  RecurringTemplate, CreateRecurringTemplateDTO,
  DashboardStats, BackupResult, RestoreResult,
  PDFExportPayload,
  ShoppingSettings, ShoppingItemWithPrices, ShoppingList, ShoppingListWithEntries, ShoppingListEntry,
  SaveShoppingSettingsDTO, CreateShoppingListDTO, UpdateShoppingListDTO,
  AddShoppingEntryDTO, UpdateShoppingEntryDTO, SupermarketId,
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
      savings: {
        getAll(): Promise<SavingsAccount[]>
        create(data: CreateSavingsAccountDTO): Promise<SavingsAccount>
        update(id: string, data: UpdateSavingsAccountDTO): Promise<SavingsAccount>
        delete(id: string): Promise<void>
      }
      debts: {
        getAll(filter?: 'active' | 'archived' | 'all'): Promise<Debt[]>
        create(data: CreateDebtDTO): Promise<Debt>
        update(id: string, data: UpdateDebtDTO): Promise<Debt>
        delete(id: string): Promise<void>
        extraPayment(payload: ExtraPaymentDTO): Promise<{ debt: Debt; transactionId: string }>
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
      shopping: {
        settings: {
          get(): Promise<ShoppingSettings>
          save(data: SaveShoppingSettingsDTO & { seeded_at?: string | null }): Promise<ShoppingSettings>
        }
        items: {
          getAll(filter?: { category?: string; query?: string }): Promise<ShoppingItemWithPrices[]>
          get(id: string): Promise<ShoppingItemWithPrices | null>
          history(id: string): Promise<Array<{ date: string; supermarket: SupermarketId; price: number }>>
          create(payload: {
            id?: string
            name: string
            brand?: string | null
            category: string
            format?: string | null
            image_url?: string | null
            skus?: Array<{ supermarket: SupermarketId; sku: string; product_name: string; product_url?: string | null; image_url?: string | null }>
          }): Promise<{ id: string }>
          setTracked(id: string, tracked: boolean): Promise<void>
          clearAll(): Promise<{ deleted: { items: number; skus: number; snapshots: number; entries: number } }>
        }
        snapshots: {
          addBulk(snapshots: Array<{
            supermarket: SupermarketId
            sku: string
            postal_code?: string | null
            price: number
            unit_price?: number | null
            in_stock?: boolean
            captured_at: string
          }>): Promise<{ inserted: number }>
        }
        lists: {
          getAll(): Promise<ShoppingList[]>
          get(id: string): Promise<ShoppingListWithEntries | null>
          create(data: CreateShoppingListDTO): Promise<ShoppingList>
          update(id: string, data: UpdateShoppingListDTO): Promise<ShoppingList>
          delete(id: string): Promise<void>
        }
        entries: {
          add(data: AddShoppingEntryDTO): Promise<ShoppingListEntry>
          update(id: string, data: UpdateShoppingEntryDTO): Promise<ShoppingListEntry>
          remove(id: string): Promise<void>
          clear(listId: string): Promise<void>
        }
        scrape: {
          search(payload: { query: string; supers?: SupermarketId[]; limit?: number; postalCode?: string | null }): Promise<Array<{
            supermarket: SupermarketId
            results: Array<{
              sku: string
              name: string
              brand: string | null
              category: string | null
              format: string | null
              ean: string | null
              imageUrl: string | null
              productUrl: string | null
              price: number
              unitPrice: number | null
              inStock: boolean
            }>
            error?: string
          }>>
          refreshTracked(payload?: { postalCode?: string | null }): Promise<{
            scanned: number
            updated: number
            failed: number
            bySupermarket: Partial<Record<SupermarketId, { updated: number; failed: number }>>
          }>
          linkSku(payload: {
            itemId: string
            supermarket: SupermarketId
            sku: string
            product_name: string
            product_url?: string | null
            image_url?: string | null
          }): Promise<unknown>
          validatePostalCode(postalCode: string): Promise<boolean>
        }
      }
    }
  }
}
