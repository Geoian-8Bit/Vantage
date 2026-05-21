import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getActiveSpace } from '@/lib/auth/space'
import { requireUser } from '@/lib/auth/session'
import { jsonOk, jsonError } from '@/lib/api/response'
import { debtService } from '@/features/debts/application/debt.service'

export const runtime = 'nodejs'

const bodySchema = z.object({
  amount: z.union([z.string(), z.number()]).transform((v) =>
    typeof v === 'number' ? v.toFixed(2) : v
  ),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  note: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const space = await getActiveSpace()
    const { id } = await params
    const body = await request.json()
    const input = bodySchema.parse(body)
    const result = await debtService.extraPayment(space.id, user.id, id, input)
    return jsonOk(result)
  } catch (err) {
    return jsonError(err)
  }
}
