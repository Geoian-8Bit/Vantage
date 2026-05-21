import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonError, jsonOk } from '@/lib/api/response'
import { updateRecurringInputSchema } from '@/features/recurring/domain/recurring.schema'
import { recurringService } from '@/features/recurring/application/recurring.service'

const idParamSchema = z.object({ id: z.string().uuid() })

interface Context {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const space = await getActiveSpace()
    const { id } = idParamSchema.parse(await params)
    const body = await request.json()
    const input = updateRecurringInputSchema.parse(body)
    const r = await recurringService.update(space.id, id, input)
    return jsonOk(r)
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const space = await getActiveSpace()
    const { id } = idParamSchema.parse(await params)
    await recurringService.remove(space.id, id)
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonError(err)
  }
}
