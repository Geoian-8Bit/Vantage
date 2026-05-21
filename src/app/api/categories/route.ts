import { type NextRequest } from 'next/server'

import { getActiveSpace } from '@/lib/auth/space'
import { jsonError, jsonOk } from '@/lib/api/response'
import { createCategoryInputSchema } from '@/features/categories/domain/category.schema'
import { categoryService } from '@/features/categories/application/category.service'

export async function GET() {
  try {
    const space = await getActiveSpace()
    const items = await categoryService.list(space.id)
    return jsonOk(items)
  } catch (err) {
    return jsonError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const space = await getActiveSpace()
    const body = await request.json()
    const input = createCategoryInputSchema.parse(body)
    const created = await categoryService.create(space.id, input)
    return jsonOk(created, { status: 201 })
  } catch (err) {
    return jsonError(err)
  }
}
