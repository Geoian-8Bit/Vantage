import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonOk, jsonError } from '@/lib/api/response'
import { requireUser } from '@/lib/auth/session'
import { transactionService } from '@/features/transactions/application/transaction.service'
import { categoryService } from '@/features/categories/application/category.service'
import { savingsService } from '@/features/savings/application/savings.service'
import { debtService } from '@/features/debts/application/debt.service'
import { recurringService } from '@/features/recurring/application/recurring.service'

export const runtime = 'nodejs'

const txSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  type: z.enum(['income', 'expense']),
  description: z.string().default(''),
  note: z.string().default(''),
  date: z.string(),
  category: z.string().default('Otros'),
})

const catSchema = z.object({
  name: z.string(),
  type: z.enum(['income', 'expense']),
})

const savingsSchema = z.object({
  name: z.string(),
  color: z.string().nullable().optional(),
  targetAmount: z.union([z.string(), z.number()]).nullable().optional(),
})

const debtSchema = z.object({
  name: z.string(),
  creditor: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  initialAmount: z.union([z.string(), z.number()]),
  monthlyAmount: z.union([z.string(), z.number()]),
  startDate: z.string(),
  notes: z.string().nullable().optional(),
})

const recurringSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  type: z.enum(['income', 'expense']),
  description: z.string(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annual']),
  nextDate: z.string(),
  active: z.boolean().default(true),
})

const payloadSchema = z.object({
  version: z.literal(1),
  transactions: z.array(txSchema).default([]),
  categories: z.array(catSchema).default([]),
  savings: z.array(savingsSchema).default([]),
  debts: z.array(debtSchema).default([]),
  recurring: z.array(recurringSchema).default([]),
})

function toAmount(v: string | number): string {
  return typeof v === 'number' ? v.toFixed(2) : v
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const space = await getActiveSpace()
    const body = await request.json()
    const payload = payloadSchema.parse(body)

    const stats = {
      categories: 0,
      savings: 0,
      debts: 0,
      recurring: 0,
      transactions: 0,
      skipped: 0,
    }

    // Categorías primero (las tx pueden referirlas por nombre)
    for (const c of payload.categories) {
      try {
        await categoryService.create(space.id, { name: c.name, type: c.type })
        stats.categories++
      } catch {
        stats.skipped++
      }
    }

    // Apartados
    for (const s of payload.savings) {
      try {
        await savingsService.create(space.id, {
          name: s.name,
          color: s.color ?? null,
          targetAmount: s.targetAmount != null ? toAmount(s.targetAmount) : null,
        })
        stats.savings++
      } catch {
        stats.skipped++
      }
    }

    // Deudas
    for (const d of payload.debts) {
      try {
        await debtService.create(space.id, {
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

    // Recurrentes
    for (const r of payload.recurring) {
      try {
        await recurringService.create(space.id, {
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

    // Transacciones (sin reconectar savingsAccountId/debtId — los IDs son
    // distintos tras reimportar. Solo categoría textual se preserva.)
    for (const t of payload.transactions) {
      try {
        await transactionService.create(space.id, user.id, {
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

    return jsonOk(stats)
  } catch (err) {
    return jsonError(err)
  }
}
