import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonOk, jsonError } from '@/lib/api/response'
import { transactionService } from '@/features/transactions/application/transaction.service'

export const runtime = 'nodejs'

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(1000),
})

export async function POST(request: NextRequest) {
  try {
    const space = await getActiveSpace()
    const body = await request.json()
    const { ids } = bodySchema.parse(body)
    const removed = await transactionService.bulkRemove(space.id, ids)
    return jsonOk({ removed, requested: ids.length })
  } catch (err) {
    return jsonError(err)
  }
}
