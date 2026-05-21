import { z } from 'zod'

export const debtSchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  name: z.string(),
  creditor: z.string().nullable(),
  color: z.string().nullable(),
  initialAmount: z.string(),
  monthlyAmount: z.string(),
  startDate: z.string(),
  recurringId: z.string().uuid().nullable(),
  archivedAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Debt = z.infer<typeof debtSchema>

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Importe inválido'))

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')

export const createDebtInputSchema = z.object({
  name: z.string().min(1).max(80),
  creditor: z.string().max(80).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  initialAmount: amountSchema,
  monthlyAmount: amountSchema,
  startDate: dateSchema,
  notes: z.string().max(2000).nullable().optional(),
})
export type CreateDebtInput = z.infer<typeof createDebtInputSchema>

export const updateDebtInputSchema = createDebtInputSchema.partial().extend({
  archivedAt: z.string().nullable().optional(),
})
export type UpdateDebtInput = z.infer<typeof updateDebtInputSchema>
