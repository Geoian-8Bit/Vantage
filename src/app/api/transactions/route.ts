import { type NextRequest } from 'next/server'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonError, jsonOk } from '@/lib/api/response'
import {
  createTransactionInputSchema,
  listTransactionsQuerySchema,
} from '@/features/transactions/domain/transaction.schema'
import { transactionService } from '@/features/transactions/application/transaction.service'

export async function GET(request: NextRequest) {
  try {
    const space = await getActiveSpace()
    const query = listTransactionsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    )
    const items = await transactionService.list(space.id, query)
    return jsonOk(items)
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const space = await getActiveSpace()
    const body = await request.json()
    const input = createTransactionInputSchema.parse(body)
    const created = await transactionService.create(space.id, await getActiveUserId(), input)
    return jsonOk(created, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}

async function getActiveUserId(): Promise<string> {
  // getActiveSpace ya invocó requireUser internamente; al volver aquí
  // el cliente Supabase tiene la sesión cacheada (cookies).
  const { requireUser } = await import('@/lib/auth/session')
  const user = await requireUser()
  return user.id
}
