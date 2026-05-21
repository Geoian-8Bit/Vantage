import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getActiveSpace } from '@/lib/auth/space'
import { requireUser } from '@/lib/auth/session'
import { jsonOk, jsonError } from '@/lib/api/response'
import { ValidationError } from '@/lib/api/errors'
import {
  isSqliteFile,
  parseLegacyDatabase,
  type LegacyExport,
} from '@/lib/utils/sqliteLegacy'
import { categoryService } from '@/features/categories/application/category.service'
import { savingsService } from '@/features/savings/application/savings.service'
import { debtService } from '@/features/debts/application/debt.service'
import { recurringService } from '@/features/recurring/application/recurring.service'
import { transactionService } from '@/features/transactions/application/transaction.service'

export const runtime = 'nodejs'
// El parseo de SQLite con sql.js puede tardar varios segundos para DBs grandes.
export const maxDuration = 60

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

const jsonPayloadSchema = z.object({
  version: z.literal(1),
  transactions: z
    .array(
      z.object({
        amount: z.union([z.string(), z.number()]),
        type: z.enum(['income', 'expense']),
        description: z.string().default(''),
        note: z.string().default(''),
        date: z.string(),
        category: z.string().default('Otros'),
      })
    )
    .default([]),
  categories: z.array(z.object({ name: z.string(), type: z.enum(['income', 'expense']) })).default([]),
  savings: z
    .array(
      z.object({
        name: z.string(),
        color: z.string().nullable().optional(),
        targetAmount: z.union([z.string(), z.number()]).nullable().optional(),
      })
    )
    .default([]),
  debts: z
    .array(
      z.object({
        name: z.string(),
        creditor: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
        initialAmount: z.union([z.string(), z.number()]),
        monthlyAmount: z.union([z.string(), z.number()]),
        startDate: z.string(),
        notes: z.string().nullable().optional(),
      })
    )
    .default([]),
  recurring: z
    .array(
      z.object({
        amount: z.union([z.string(), z.number()]),
        type: z.enum(['income', 'expense']),
        description: z.string(),
        frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annual']),
        nextDate: z.string(),
        active: z.boolean().default(true),
      })
    )
    .default([]),
})

function toAmount(v: string | number): string {
  return typeof v === 'number' ? v.toFixed(2) : v
}

interface ImportStats {
  categories: number
  savings: number
  debts: number
  recurring: number
  transactions: number
  skipped: number
}

async function importLegacy(
  spaceId: string,
  userId: string,
  data: LegacyExport
): Promise<ImportStats> {
  const stats: ImportStats = {
    categories: 0,
    savings: 0,
    debts: 0,
    recurring: 0,
    transactions: 0,
    skipped: 0,
  }

  for (const c of data.categories) {
    try {
      await categoryService.create(spaceId, { name: c.name, type: c.type })
      stats.categories++
    } catch {
      stats.skipped++
    }
  }

  // Apartados: mantenemos un mapa key legacy → id nuevo para reconectar tx.
  const savingsKeyToId = new Map<string, string>()
  for (const s of data.savings) {
    try {
      const created = await savingsService.create(spaceId, {
        name: s.name,
        color: s.color,
        targetAmount: s.targetAmount,
      })
      savingsKeyToId.set(s.key, created.id)
      stats.savings++
    } catch {
      stats.skipped++
    }
  }

  // Deudas: igual.
  const debtKeyToId = new Map<string, string>()
  for (const d of data.debts) {
    try {
      const created = await debtService.create(spaceId, {
        name: d.name,
        creditor: d.creditor,
        color: d.color,
        initialAmount: d.initialAmount,
        monthlyAmount: d.monthlyAmount,
        startDate: d.startDate,
        notes: d.notes,
      })
      debtKeyToId.set(d.key, created.id)
      stats.debts++
    } catch {
      stats.skipped++
    }
  }

  for (const r of data.recurring) {
    try {
      await recurringService.create(spaceId, {
        amount: r.amount,
        type: r.type,
        description: r.description,
        frequency: r.frequency,
        nextDate: r.nextDate,
        active: r.active,
      })
      stats.recurring++
    } catch {
      stats.skipped++
    }
  }

  for (const t of data.transactions) {
    try {
      await transactionService.create(spaceId, userId, {
        amount: t.amount.toFixed(2),
        type: t.type,
        description: t.description || (t.type === 'income' ? 'Ingreso' : 'Gasto'),
        note: t.note,
        date: t.date,
        category: t.category,
        savingsAccountId: t.savingsAccountKey
          ? savingsKeyToId.get(t.savingsAccountKey) ?? null
          : null,
        debtId: t.debtKey ? debtKeyToId.get(t.debtKey) ?? null : null,
      })
      stats.transactions++
    } catch {
      stats.skipped++
    }
  }

  return stats
}

async function importJson(
  spaceId: string,
  userId: string,
  payload: z.infer<typeof jsonPayloadSchema>
): Promise<ImportStats> {
  const stats: ImportStats = {
    categories: 0,
    savings: 0,
    debts: 0,
    recurring: 0,
    transactions: 0,
    skipped: 0,
  }

  for (const c of payload.categories) {
    try {
      await categoryService.create(spaceId, { name: c.name, type: c.type })
      stats.categories++
    } catch {
      stats.skipped++
    }
  }

  for (const s of payload.savings) {
    try {
      await savingsService.create(spaceId, {
        name: s.name,
        color: s.color ?? null,
        targetAmount: s.targetAmount != null ? toAmount(s.targetAmount) : null,
      })
      stats.savings++
    } catch {
      stats.skipped++
    }
  }

  for (const d of payload.debts) {
    try {
      await debtService.create(spaceId, {
        name: d.name,
        creditor: d.creditor ?? null,
        color: d.color ?? null,
        initialAmount: toAmount(d.initialAmount),
        monthlyAmount: toAmount(d.monthlyAmount),
        startDate: d.startDate,
        notes: d.notes ?? null,
      })
      stats.debts++
    } catch {
      stats.skipped++
    }
  }

  for (const r of payload.recurring) {
    try {
      await recurringService.create(spaceId, {
        amount: toAmount(r.amount),
        type: r.type,
        description: r.description,
        frequency: r.frequency,
        nextDate: r.nextDate,
        active: r.active,
      })
      stats.recurring++
    } catch {
      stats.skipped++
    }
  }

  for (const t of payload.transactions) {
    try {
      await transactionService.create(spaceId, userId, {
        amount: toAmount(t.amount),
        type: t.type,
        description: t.description,
        note: t.note,
        date: t.date,
        category: t.category,
      })
      stats.transactions++
    } catch {
      stats.skipped++
    }
  }

  return stats
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const space = await getActiveSpace()
    const contentType = request.headers.get('content-type') ?? ''

    let stats: ImportStats

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return jsonError(new Error('Falta el archivo'))
      }
      if (file.size > MAX_BYTES) {
        return jsonError(
          new Error(`Archivo demasiado grande (máx ${MAX_BYTES / 1024 / 1024} MB)`)
        )
      }
      const buf = Buffer.from(await file.arrayBuffer())
      const name = file.name.toLowerCase()

      if (isSqliteFile(buf) || name.endsWith('.db') || name.endsWith('.sqlite')) {
        let data
        try {
          data = await parseLegacyDatabase(buf)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          return jsonError(new ValidationError(`No se pudo leer el .db SQLite: ${msg}`))
        }
        stats = await importLegacy(space.id, user.id, data)
      } else {
        // Asumimos JSON
        let parsed: z.infer<typeof jsonPayloadSchema>
        try {
          const text = buf.toString('utf-8')
          parsed = jsonPayloadSchema.parse(JSON.parse(text))
        } catch {
          return jsonError(new Error('Archivo no reconocido. Sube un .json de Vantage o un .db SQLite del Electron antiguo.'))
        }
        stats = await importJson(space.id, user.id, parsed)
      }
    } else {
      // JSON body (compatibilidad con la versión anterior)
      const body = await request.json()
      const payload = jsonPayloadSchema.parse(body)
      stats = await importJson(space.id, user.id, payload)
    }

    return jsonOk(stats)
  } catch (err) {
    return jsonError(err)
  }
}
