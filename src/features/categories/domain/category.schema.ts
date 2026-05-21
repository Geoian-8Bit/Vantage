import { z } from 'zod'

import { txTypeSchema } from '@/features/transactions/domain/transaction.schema'

export const categorySchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  name: z.string(),
  type: txTypeSchema,
  createdAt: z.string(),
})
export type Category = z.infer<typeof categorySchema>

export const createCategoryInputSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(50),
  type: txTypeSchema,
})
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>

export const updateCategoryInputSchema = createCategoryInputSchema.partial()
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>
