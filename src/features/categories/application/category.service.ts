import 'server-only'

import { NotFoundError } from '@/lib/api/errors'

import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../domain/category.schema'
import { categoryRepository } from '../infrastructure/category.repository'

export const categoryService = {
  list(spaceId: string): Promise<Category[]> {
    return categoryRepository.findAll(spaceId)
  },

  create(spaceId: string, input: CreateCategoryInput): Promise<Category> {
    return categoryRepository.create(spaceId, input)
  },

  async update(spaceId: string, id: string, input: UpdateCategoryInput): Promise<Category> {
    const cat = await categoryRepository.update(spaceId, id, input)
    if (!cat) throw new NotFoundError('Categoría no encontrada')
    return cat
  },

  async remove(spaceId: string, id: string): Promise<void> {
    const ok = await categoryRepository.remove(spaceId, id)
    if (!ok) throw new NotFoundError('Categoría no encontrada')
  },
}
