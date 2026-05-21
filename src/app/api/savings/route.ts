import { type NextRequest } from 'next/server'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonError, jsonOk } from '@/lib/api/response'
import { createSavingsInputSchema } from '@/features/savings/domain/savings.schema'
import { savingsService } from '@/features/savings/application/savings.service'

export async function GET() {
  try {
    const space = await getActiveSpace()
    const items = await savingsService.list(space.id)
    return jsonOk(items)
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const space = await getActiveSpace()
    const body = await request.json()
    const input = createSavingsInputSchema.parse(body)
    const created = await savingsService.create(space.id, input)
    return jsonOk(created, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}
