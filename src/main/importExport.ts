import { dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import type {
  ImportFilePreview,
  RawImportRow,
  ImportCommitPayload,
  ImportCommitResult,
} from '../shared/types'
import { createTransaction } from './database/transactions'

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
