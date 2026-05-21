import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonError, jsonOk } from '@/lib/api/response'
import { updateCategoryInputSchema } from '@/features/categories/domain/category.schema'
import { categoryService } from '@/features/categories/application/category.service'

const idParamSchema = z.object({ id: z.string().uuid() })

interface Context {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const space = await getActiveSpace()
    const { id } = idParamSchema.parse(await params)
    const body = await request.json()
    const input = updateCategoryInputSchema.parse(body)
    const cat = await categoryService.update(space.id, id, input)
    return jsonOk(cat)
  } catch (err) {
    return jsonError(err)
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const space = await getActiveSpace()
    const { id } = idParamSchema.parse(await params)
    await categoryService.remove(space.id, id)
    return jsonOk({ ok: true })
  } catch (err) {
    return jsonError(err)
  }
}
