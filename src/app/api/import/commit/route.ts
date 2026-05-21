import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getActiveSpace } from '@/lib/auth/space'
import { requireUser } from '@/lib/auth/session'
import { jsonOk, jsonError } from '@/lib/api/response'
import { validateRows, type RawImportRow } from '@/lib/utils/importValidation'
import { transactionService } from '@/features/transactions/application/transaction.service'

export const runtime = 'nodejs'

const commitSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())),
  mapping: z.object({
    amount: z.string().nullable(),
    type: z.string().nullable(),
    date: z.string().nullable(),
    description: z.string().nullable(),
    category: z.string().nullable(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const space = await getActiveSpace()
    const body = await request.json()
    const { rows, mapping } = commitSchema.parse(body)

    const result = validateRows(rows as RawImportRow[], mapping)

    let inserted = 0
    const errors: string[] = []
    for (const r of result.validRows) {
      try {
        await transactionService.create(space.id, user.id, {
          amount: r.amount.toFixed(2),
          type: r.type,
          description: r.description || (r.type === 'income' ? 'Ingreso' : 'Gasto'),
          note: '',
          date: r.date,
          category: r.category,
        })
        inserted++
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }

    return jsonOk({
      inserted,
      invalid: result.invalidRows.length,
      errors: errors.slice(0, 10),
      invalidRows: result.invalidRows.slice(0, 20),
    })
  } catch (err) {
    return jsonError(err)
  }
}
