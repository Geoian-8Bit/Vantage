import { dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import * as XLSX from 'xlsx'
import type {
  ImportFilePreview,
  RawImportRow,
  ImportCommitPayload,
  ImportCommitResult,
} from '../shared/types'
import { createTransaction } from './database/transactions'
import { getAllCategories, createCategory } from './database/categories'

// ── Helpers ────────────────────────────────────────────────────────────────

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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const MDBReader = require('mdb-reader')
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const MDBReader = require('mdb-reader')
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
      createTransaction(row)
      inserted++
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }

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

    const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

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
