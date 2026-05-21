import { type NextRequest } from 'next/server'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonError, jsonOk } from '@/lib/api/response'
import { createRecurringInputSchema } from '@/features/recurring/domain/recurring.schema'
import { recurringService } from '@/features/recurring/application/recurring.service'

export async function GET() {
  try {
    const space = await getActiveSpace()
    const items = await recurringService.list(space.id)
    return jsonOk(items)
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const space = await getActiveSpace()
    const body = await request.json()
    const input = createRecurringInputSchema.parse(body)
    const created = await recurringService.create(space.id, input)
    return jsonOk(created, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}
