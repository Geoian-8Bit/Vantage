import { dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import * as XLSX from 'xlsx'
import type {
  ImportFilePreview,
  RawImportRow,
  ImportCommitPayload,
  ImportCommitResult,
  AccessGeshogarPreview,
  AccessGeshogarRunResult,
} from '../shared/types'
import { createTransactionNoSave } from './database/transactions'
import { getAllCategories, createCategory } from './database/categories'
import { saveDatabase } from './database/schema'

// ── Helpers ────────────────────────────────────────────────────────────────

// `mdb-reader` se exporta como ESM default. Tras el bundle de electron-vite,
// `require('mdb-reader')` devuelve `{ default: MDBReader }` en lugar de la
// clase directamente — usar la clase produce "is not a constructor" en runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MDBReaderModule = require('mdb-reader')
const MDBReader = MDBReaderModule.default ?? MDBReaderModule

function getFocusedWindow(): BrowserWindow {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

// ── File dialog ────────────────────────────────────────────────────────────

export async function handleDialogOpenFile(
  _event: Electron.IpcMainInvokeEvent,
  options: { filters: { name: string; extensions: string[] }[]; title?: string }
): Promise<string | null> {
  const result = await dialog.showOpenDialog(getFocusedWindow(), {
    properties: ['openFile'],
    filters: options.filters,
    title: options.title ?? 'Seleccionar archivo',
  })
  return result.canceled ? null : result.filePaths[0]
}

// ── Export — renderer generates the xlsx buffer, main just saves it ─────────

export async function handleExportTransactionsExcel(
  _event: Electron.IpcMainInvokeEvent,
  payload: { buffer: string; defaultPath: string }
): Promise<void> {
  const { canceled, filePath } = await dialog.showSaveDialog(getFocusedWindow(), {
    title: 'Exportar movimientos',
    defaultPath: payload.defaultPath,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  })
  if (canceled || !filePath) return
  writeFileSync(filePath, Buffer.from(payload.buffer, 'base64'))
}

// ── Import: Excel ──────────────────────────────────────────────────────────

export function handleParseExcel(
  _event: Electron.IpcMainInvokeEvent,
  filePath: string
): ImportFilePreview {
  const buf = readFileSync(filePath)
  const wb  = XLSX.read(buf, { type: 'buffer', cellDates: true })
  const ws  = wb.Sheets[wb.SheetNames[0]]

  // header:1 returns string[][] — row 0 is headers
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  if (raw.length === 0) return { columns: [], rows: [], totalRows: 0 }

  const headers = (raw[0] as unknown[])
    .map(h => String(h ?? '').trim())
    .filter(Boolean)

  if (headers.length === 0) return { columns: [], rows: [], totalRows: 0 }

  const dataRows = raw.slice(1)

  function toRawRow(row: unknown[]): RawImportRow {
    const obj: RawImportRow = {}
    headers.forEach((h, i) => {
      const cell = row[i]
      if (cell instanceof Date) {
        obj[h] = cell.toISOString().slice(0, 10)
      } else {
        obj[h] = String(cell ?? '').trim()
      }
    })
    return obj
  }

  return {
    columns:   headers,
    rows:      dataRows.map(r => toRawRow(r as unknown[])),
    totalRows: dataRows.length,
  }
}

// ── Import: Access — list tables ───────────────────────────────────────────

export function handleAccessTables(
  _event: Electron.IpcMainInvokeEvent,
  filePath: string
): { tables: string[] } {
  const buf    = readFileSync(filePath)
  const reader = new MDBReader(buf)
  const tables = (reader.getTableNames() as string[]).filter(t => !t.startsWith('MSys'))
  return { tables }
}

// ── Import: Access — parse table ───────────────────────────────────────────

export function handleParseAccess(
  _event: Electron.IpcMainInvokeEvent,
  args: { filePath: string; tableName: string }
): ImportFilePreview {
  const buf    = readFileSync(args.filePath)
  const reader = new MDBReader(buf)
  const table  = reader.getTable(args.tableName)
  const data   = table.getData() as Record<string, unknown>[]

  if (data.length === 0) {
    return { columns: [], rows: [], totalRows: 0, tableName: args.tableName }
  }

  const columns = Object.keys(data[0])

  function toRawRow(record: Record<string, unknown>): RawImportRow {
    const obj: RawImportRow = {}
    for (const col of columns) {
      const v = record[col]
      obj[col] = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').trim()
    }
    return obj
  }

  return {
    columns,
    rows:      data.map(toRawRow),
    totalRows: data.length,
    tableName: args.tableName,
  }
}

// ── Import: Access — formato GesHogar (importación automática) ─────────────
//
// GesHogar (gestión de hogar) usa siempre el mismo esquema:
//   · Apuntes_Gastos    — todos los movimientos de gasto (type implícito).
//   · Apuntes_Ingresos  — todos los movimientos de ingreso (type implícito).
//   · Cuentas           — catálogo de categorías con su tipo (booleano).
// El flujo manual de mapear columnas no encaja porque el "type" no es una
// columna sino que viene determinado por la tabla. Detectamos el formato y
// ofrecemos una importación de un solo click.

const GESHOGAR_TABLES = {
  EXPENSES:  'Apuntes_Gastos',
  INCOMES:   'Apuntes_Ingresos',
  ACCOUNTS:  'Cuentas',
} as const

const GESHOGAR_KNOWN_TABLES = new Set<string>([
  GESHOGAR_TABLES.EXPENSES,
  GESHOGAR_TABLES.INCOMES,
  GESHOGAR_TABLES.ACCOUNTS,
])

function ghParseAmount(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) && v !== 0 ? Math.abs(v) : null
  const s = String(v).trim()
    .replace(/[€$£\s]/g, '')
    .replace(/\.(?=\d{3}(,|$))/g, '')
    .replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) || n === 0 ? null : Math.abs(n)
}

function ghParseDate(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  return null
}

function ghStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

export function handleAccessGeshogarDetect(
  _event: Electron.IpcMainInvokeEvent,
  filePath: string
): AccessGeshogarPreview {
  const buf    = readFileSync(filePath)
  const reader = new MDBReader(buf)
  const tables = (reader.getTableNames() as string[]).filter(t => !t.startsWith('MSys'))

  const hasExpenses = tables.includes(GESHOGAR_TABLES.EXPENSES)
  const hasIncomes  = tables.includes(GESHOGAR_TABLES.INCOMES)
  const hasAccounts = tables.includes(GESHOGAR_TABLES.ACCOUNTS)

  if (!hasExpenses && !hasIncomes) {
    return { isGeshogar: false, expenseCount: 0, incomeCount: 0, categoryCount: 0, otherTables: tables }
  }

  const expenseCount  = hasExpenses ? reader.getTable(GESHOGAR_TABLES.EXPENSES).getData().length : 0
  const incomeCount   = hasIncomes  ? reader.getTable(GESHOGAR_TABLES.INCOMES).getData().length  : 0
  const categoryCount = hasAccounts ? reader.getTable(GESHOGAR_TABLES.ACCOUNTS).getData().length : 0
  const otherTables   = tables.filter(t => !GESHOGAR_KNOWN_TABLES.has(t))

  return { isGeshogar: true, expenseCount, incomeCount, categoryCount, otherTables }
}

export function handleAccessGeshogarRun(
  _event: Electron.IpcMainInvokeEvent,
  filePath: string
): AccessGeshogarRunResult {
  const buf    = readFileSync(filePath)
  const reader = new MDBReader(buf)
  const tables = new Set((reader.getTableNames() as string[]).filter(t => !t.startsWith('MSys')))

  if (!tables.has(GESHOGAR_TABLES.EXPENSES) && !tables.has(GESHOGAR_TABLES.INCOMES)) {
    throw new Error('El archivo no tiene la estructura GesHogar esperada (faltan Apuntes_Gastos y Apuntes_Ingresos).')
  }

  const errors: string[] = []
  let categoriesCreated = 0
  let expensesInserted  = 0
  let incomesInserted   = 0

  // 1) Crear categorías a partir de la tabla "Cuentas". El campo
  //    "Tipo (Ingreso/gasto)" es booleano: true=ingreso, false=gasto.
  const existingByKey = new Set(
    getAllCategories().map(c => `${c.type}:${c.name.toLowerCase()}`)
  )

  if (tables.has(GESHOGAR_TABLES.ACCOUNTS)) {
    const cuentas = reader.getTable(GESHOGAR_TABLES.ACCOUNTS).getData() as Record<string, unknown>[]
    for (const c of cuentas) {
      const name = ghStr(c['IdCuenta'])
      if (!name) continue
      const type: 'income' | 'expense' = c['Tipo (Ingreso/gasto)'] === true ? 'income' : 'expense'
      const key = `${type}:${name.toLowerCase()}`
      if (existingByKey.has(key)) continue
      try {
        createCategory({ name, type })
        existingByKey.add(key)
        categoriesCreated++
      } catch (err) {
        errors.push(`Categoría "${name}": ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // 2) Importar gastos
  if (tables.has(GESHOGAR_TABLES.EXPENSES)) {
    const data = reader.getTable(GESHOGAR_TABLES.EXPENSES).getData() as Record<string, unknown>[]
    for (const row of data) {
      const id = row['IdApunte']
      try {
        const amount = ghParseAmount(row['Importe'])
        if (amount === null) { errors.push(`Gasto #${id}: importe inválido (${row['Importe']})`); continue }
        const date = ghParseDate(row['Fecha'])
        if (date === null) { errors.push(`Gasto #${id}: fecha inválida (${row['Fecha']})`); continue }

        const category   = ghStr(row['Cuenta']) || 'Otros'
        const description = ghStr(row['Descripción'])
        const formaPago   = ghStr(row['Forma_pago'])
        const note        = formaPago ? `Forma de pago: ${formaPago}` : ''

        // Si la categoría no existe en Cuentas tampoco, asegurarla en Vantage
        const catKey = `expense:${category.toLowerCase()}`
        if (!existingByKey.has(catKey) && category.toLowerCase() !== 'otros') {
          try { createCategory({ name: category, type: 'expense' }); existingByKey.add(catKey); categoriesCreated++ }
          catch { /* ignore — la categoría puede existir en otro tipo */ }
        }

        createTransactionNoSave({
          amount, type: 'expense', description, date, category, note,
        })
        expensesInserted++
      } catch (err) {
        errors.push(`Gasto #${id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // 3) Importar ingresos
  if (tables.has(GESHOGAR_TABLES.INCOMES)) {
    const data = reader.getTable(GESHOGAR_TABLES.INCOMES).getData() as Record<string, unknown>[]
    for (const row of data) {
      const id = row['IdApunte']
      try {
        const amount = ghParseAmount(row['Importe'])
        if (amount === null) { errors.push(`Ingreso #${id}: importe inválido (${row['Importe']})`); continue }
        const date = ghParseDate(row['Fecha'])
        if (date === null) { errors.push(`Ingreso #${id}: fecha inválida (${row['Fecha']})`); continue }

        const category    = ghStr(row['Ingreso']) || 'Sin categoría'
        const description = ghStr(row['Descripción'])

        const catKey = `income:${category.toLowerCase()}`
        if (!existingByKey.has(catKey) && category.toLowerCase() !== 'sin categoría') {
          try { createCategory({ name: category, type: 'income' }); existingByKey.add(catKey); categoriesCreated++ }
          catch { /* ignore */ }
        }

        createTransactionNoSave({
          amount, type: 'income', description, date, category,
        })
        incomesInserted++
      } catch (err) {
        errors.push(`Ingreso #${id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const inserted = expensesInserted + incomesInserted
  if (inserted > 0 || categoriesCreated > 0) saveDatabase()

  return { inserted, expensesInserted, incomesInserted, categoriesCreated, errors }
}

// ── Import: commit ─────────────────────────────────────────────────────────

export function handleImportCommit(
  _event: Electron.IpcMainInvokeEvent,
  payload: ImportCommitPayload
): ImportCommitResult {
  // Auto-create categories that don't exist yet
  const existingNames = new Set(getAllCategories().map(c => c.name.toLowerCase()))
  const seen = new Set<string>()
  for (const row of payload.rows) {
    const cat = row.category?.trim()
    if (cat && !existingNames.has(cat.toLowerCase()) && !seen.has(cat.toLowerCase())) {
      seen.add(cat.toLowerCase())
      createCategory({ name: cat, type: row.type })
    }
  }

  let inserted = 0
  const errors: string[] = []

  for (const row of payload.rows) {
    try {
      createTransactionNoSave(row)
      inserted++
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }

  // Single disk write for the entire import batch
  if (inserted > 0) saveDatabase()

  return { inserted, errors }
}

// ── Export: PDF ──────────────────────────────────────────────────────────

export async function handleExportPDF(
  _event: Electron.IpcMainInvokeEvent,
  payload: { title: string; period: string; income: number; expenses: number; balance: number; categories: { name: string; amount: number; percent: number }[]; transactions: { date: string; description: string; category: string; amount: number; type: string }[] }
): Promise<void> {
  const PDFDocument = (await import('pdfkit')).default

  const { canceled, filePath } = await dialog.showSaveDialog(getFocusedWindow(), {
    title: 'Exportar reporte PDF',
    defaultPath: `vantage-reporte-${payload.period.replace(/\s/g, '-')}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return

  const { createWriteStream } = await import('fs')

  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const stream = createWriteStream(filePath)
    doc.pipe(stream)

    const fmt = (n: number) => {
      const fixed = Math.abs(n).toFixed(2)
      const [intPart, decPart] = fixed.split('.')
      const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      const sign = n < 0 ? '-' : ''
      return `${sign}${withDots},${decPart} €`
    }

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Vantage', { align: 'center' })
    doc.fontSize(10).font('Helvetica').fillColor('#6B6B6F').text('Reporte de movimientos', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#2D2D2F').text(payload.period, { align: 'center' })
    doc.moveDown(1)

    // Summary
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2D2D2F').text('Resumen')
    doc.moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
    doc.fillColor('#1B7A4E').text(`Ingresos:  ${fmt(payload.income)}`)
    doc.fillColor('#7A1B2D').text(`Gastos:    ${fmt(payload.expenses)}`)
    doc.fillColor(payload.balance >= 0 ? '#1B7A4E' : '#7A1B2D').text(`Balance:   ${fmt(payload.balance)}`)
    doc.moveDown(1)

    // Categories
    if (payload.categories.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2D2D2F').text('Gastos por categoría')
      doc.moveDown(0.3)
      doc.fontSize(9).font('Helvetica').fillColor('#6B6B6F')
      for (const cat of payload.categories) {
        doc.text(`${cat.name}:  ${fmt(cat.amount)}  (${cat.percent}%)`)
      }
      doc.moveDown(1)
    }

    // Transactions table
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2D2D2F').text('Movimientos')
    doc.moveDown(0.3)

    const tableTop = doc.y
    const col = { date: 50, desc: 130, cat: 310, amount: 430 }

    // Table header
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#6B6B6F')
    doc.text('Fecha', col.date, tableTop)
    doc.text('Descripción', col.desc, tableTop)
    doc.text('Categoría', col.cat, tableTop)
    doc.text('Importe', col.amount, tableTop)
    doc.moveDown(0.5)

    const lineY = doc.y
    doc.moveTo(50, lineY).lineTo(545, lineY).strokeColor('#E2E0DE').lineWidth(0.5).stroke()
    doc.moveDown(0.3)

    doc.fontSize(8).font('Helvetica')
    for (const t of payload.transactions) {
      if (doc.y > 750) {
        doc.addPage()
      }
      const y = doc.y
      doc.fillColor('#2D2D2F').text(t.date, col.date, y, { width: 70 })
      doc.text(t.description || (t.type === 'income' ? 'Ingreso' : 'Gasto'), col.desc, y, { width: 170 })
      doc.text(t.category, col.cat, y, { width: 110 })
      doc.fillColor(t.type === 'income' ? '#1B7A4E' : '#7A1B2D')
        .text(`${t.type === 'income' ? '+' : '−'}${fmt(t.amount)}`, col.amount, y, { width: 115 })
      doc.moveDown(0.4)
    }

    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}
