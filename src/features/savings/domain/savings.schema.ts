import { z } from 'zod'

export const savingsAccountSchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
  targetAmount: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type SavingsAccount = z.infer<typeof savingsAccountSchema>

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Importe inválido'))

export const createSavingsInputSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(60),
  color: z.string().max(50).nullable().optional(),
  targetAmount: amountSchema.nullable().optional(),
})
export type CreateSavingsInput = z.infer<typeof createSavingsInputSchema>

export const updateSavingsInputSchema = createSavingsInputSchema.partial()
export type UpdateSavingsInput = z.infer<typeof updateSavingsInputSchema>
