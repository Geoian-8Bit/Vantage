import { type NextRequest } from 'next/server'

import { getActiveSpace } from '@/lib/auth/space'
import { requireNonAnonymousUser } from '@/lib/auth/session'
import { jsonOk, jsonError } from '@/lib/api/response'
import { ValidationError } from '@/lib/api/errors'
import { transactionService } from '@/features/transactions/application/transaction.service'
import { categoryService } from '@/features/categories/application/category.service'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

const GESHOGAR_TABLES = {
  EXPENSES: 'Apuntes_Gastos',
  INCOMES: 'Apuntes_Ingresos',
  ACCOUNTS: 'Cuentas',
} as const

function ghParseAmount(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) && v !== 0 ? Math.abs(v) : null
  const s = String(v)
    .trim()
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireNonAnonymousUser()
    const space = await getActiveSpace()
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return jsonError(new ValidationError('Falta el archivo'))
    }
    if (file.size > MAX_BYTES) {
      return jsonError(
        new ValidationError(`Archivo demasiado grande (máx ${MAX_BYTES / 1024 / 1024} MB)`)
      )
    }
    const name = file.name.toLowerCase()
    if (!name.endsWith('.mdb') && !name.endsWith('.accdb')) {
      return jsonError(new ValidationError('Formato no soportado. Sube un .mdb o .accdb'))
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const MDBReader = (await import('mdb-reader')).default
    let reader
    try {
      reader = new MDBReader(buf)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return jsonError(new ValidationError(`No se pudo abrir el .mdb: ${msg}`))
    }

    const tables = reader.getTableNames().filter((t) => !t.startsWith('MSys'))
    const hasExpenses = tables.includes(GESHOGAR_TABLES.EXPENSES)
    const hasIncomes = tables.includes(GESHOGAR_TABLES.INCOMES)
    const hasAccounts = tables.includes(GESHOGAR_TABLES.ACCOUNTS)

    if (!hasExpenses && !hasIncomes) {
      return jsonError(
        new ValidationError(
          `El archivo Access no tiene la estructura esperada. Solo soportamos exports tipo Geshogar (tablas Apuntes_Gastos, Apuntes_Ingresos, Cuentas). Tablas encontradas: ${tables.join(', ') || 'ninguna'}.`
        )
      )
    }

    const stats = {
      categoriesCreated: 0,
      expensesInserted: 0,
      incomesInserted: 0,
      errors: [] as string[],
    }

    // 1) Categorías desde "Cuentas"
    const existingCats = await categoryService.list(space.id)
    const existingByKey = new Set(
      existingCats.map((c) => `${c.type}:${c.name.toLowerCase()}`)
    )

    if (hasAccounts) {
      const cuentas = reader
        .getTable(GESHOGAR_TABLES.ACCOUNTS)
        .getData() as Record<string, unknown>[]
      for (const c of cuentas) {
        const catName = ghStr(c['IdCuenta'])
        if (!catName) continue
        const type: 'income' | 'expense' =
          c['Tipo (Ingreso/gasto)'] === true ? 'income' : 'expense'
        const key = `${type}:${catName.toLowerCase()}`
        if (existingByKey.has(key)) continue
        try {
          await categoryService.create(space.id, { name: catName, type })
          existingByKey.add(key)
          stats.categoriesCreated++
        } catch (err) {
          stats.errors.push(
            `Categoría "${catName}": ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }
    }

    // 2) Gastos
    if (hasExpenses) {
      const data = reader
        .getTable(GESHOGAR_TABLES.EXPENSES)
        .getData() as Record<string, unknown>[]
      for (const row of data) {
        const id = row['IdApunte']
        try {
          const amount = ghParseAmount(row['Importe'])
          if (amount === null) {
            stats.errors.push(`Gasto #${id}: importe inválido (${row['Importe']})`)
            continue
          }
          const date = ghParseDate(row['Fecha'])
          if (date === null) {
            stats.errors.push(`Gasto #${id}: fecha inválida (${row['Fecha']})`)
            continue
          }
          const category = ghStr(row['Cuenta']) || 'Otros'
          const description = ghStr(row['Descripción'])
          const formaPago = ghStr(row['Forma_pago'])
          const note = formaPago ? `Forma de pago: ${formaPago}` : ''

          const catKey = `expense:${category.toLowerCase()}`
          if (!existingByKey.has(catKey) && category.toLowerCase() !== 'otros') {
            try {
              await categoryService.create(space.id, { name: category, type: 'expense' })
              existingByKey.add(catKey)
              stats.categoriesCreated++
            } catch {
              // categoría puede existir en otro tipo
            }
          }

          await transactionService.create(space.id, user.id, {
            amount: amount.toFixed(2),
            type: 'expense',
            description: description || 'Gasto',
            note,
            date,
            category,
          })
          stats.expensesInserted++
        } catch (err) {
          stats.errors.push(
            `Gasto #${id}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }
    }

    // 3) Ingresos
    if (hasIncomes) {
      const data = reader
        .getTable(GESHOGAR_TABLES.INCOMES)
        .getData() as Record<string, unknown>[]
      for (const row of data) {
        const id = row['IdApunte']
        try {
          const amount = ghParseAmount(row['Importe'])
          if (amount === null) {
            stats.errors.push(`Ingreso #${id}: importe inválido (${row['Importe']})`)
            continue
          }
          const date = ghParseDate(row['Fecha'])
          if (date === null) {
            stats.errors.push(`Ingreso #${id}: fecha inválida (${row['Fecha']})`)
            continue
          }
          const category = ghStr(row['Ingreso']) || 'Sin categoría'
          const description = ghStr(row['Descripción'])

          const catKey = `income:${category.toLowerCase()}`
          if (!existingByKey.has(catKey) && category.toLowerCase() !== 'sin categoría') {
            try {
              await categoryService.create(space.id, { name: category, type: 'income' })
              existingByKey.add(catKey)
              stats.categoriesCreated++
            } catch {
              // categoría puede existir en otro tipo
            }
          }

          await transactionService.create(space.id, user.id, {
            amount: amount.toFixed(2),
            type: 'income',
            description: description || 'Ingreso',
            note: '',
            date,
            category,
          })
          stats.incomesInserted++
        } catch (err) {
          stats.errors.push(
            `Ingreso #${id}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }
    }

    return jsonOk({
      ...stats,
      inserted: stats.expensesInserted + stats.incomesInserted,
      errors: stats.errors.slice(0, 20),
    })
  } catch (err) {
    return jsonError(err)
  }
}
