import { z } from 'zod'

import { txTypeSchema } from '@/features/transactions/domain/transaction.schema'

export const recurringFreqSchema = z.enum(['weekly', 'monthly', 'quarterly', 'annual'])
export type RecurringFrequency = z.infer<typeof recurringFreqSchema>

export const recurringTemplateSchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  amount: z.string(),
  type: txTypeSchema,
  description: z.string(),
  categoryId: z.string().uuid().nullable(),
  frequency: recurringFreqSchema,
  nextDate: z.string(),
  active: z.boolean(),
  debtId: z.string().uuid().nullable(),
  savingsAccountId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type RecurringTemplate = z.infer<typeof recurringTemplateSchema>

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Importe inválido'))

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')

export const createRecurringInputSchema = z.object({
  amount: amountSchema,
  type: txTypeSchema,
  description: z.string().min(1).max(200),
  categoryId: z.string().uuid().nullable().optional(),
  frequency: recurringFreqSchema,
  nextDate: dateSchema,
  active: z.boolean().default(true),
})
export type CreateRecurringInput = z.infer<typeof createRecurringInputSchema>

export const updateRecurringInputSchema = createRecurringInputSchema.partial()
export type UpdateRecurringInput = z.infer<typeof updateRecurringInputSchema>
