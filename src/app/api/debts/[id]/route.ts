import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonError, jsonOk } from '@/lib/api/response'
import { updateDebtInputSchema } from '@/features/debts/domain/debt.schema'
import { debtService } from '@/features/debts/application/debt.service'

const idParamSchema = z.object({ id: z.string().uuid() })

interface Context {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const space = await getActiveSpace()
    const { id } = idParamSchema.parse(await params)
    const body = await request.json()
    const input = updateDebtInputSchema.parse(body)
    const d = await debtService.update(space.id, id, input)
    return jsonOk(d)
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const space = await getActiveSpace()
    const { id } = idParamSchema.parse(await params)
    await debtService.remove(space.id, id)
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonError(err)
  }
}
