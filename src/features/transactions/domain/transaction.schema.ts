import { z } from 'zod'

export const txTypeSchema = z.enum(['income', 'expense'])
export type TxType = z.infer<typeof txTypeSchema>

/**
 * Forma canónica de una transacción tal como vive en la API.
 * Las fechas viajan como strings ISO; los importes como string decimal
 * (`numeric(15,2)` en Postgres se serializa como string para no perder precisión).
 */
export const transactionSchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  amount: z.string(),
  type: txTypeSchema,
  description: z.string(),
  note: z.string(),
  date: z.string(),
  category: z.string(),
  categoryId: z.string().uuid().nullable(),
  savingsAccountId: z.string().uuid().nullable(),
  debtId: z.string().uuid().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Transaction = z.infer<typeof transactionSchema>

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .pipe(
    z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/, 'Importe inválido (máximo 2 decimales)')
      .refine((v) => Number(v) !== 0, 'El importe no puede ser cero')
  )

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida, formato YYYY-MM-DD')

export const createTransactionInputSchema = z.object({
  amount: amountSchema,
  type: txTypeSchema,
  description: z.string().min(1, 'La descripción es obligatoria').max(200),
  note: z.string().max(1000).default(''),
  date: dateSchema,
  category: z.string().min(1).max(50).default('Otros'),
  categoryId: z.string().uuid().nullable().optional(),
  savingsAccountId: z.string().uuid().nullable().optional(),
  debtId: z.string().uuid().nullable().optional(),
})
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>

export const updateTransactionInputSchema = createTransactionInputSchema.partial()
export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>

export const listTransactionsQuerySchema = z.object({
  type: txTypeSchema.optional(),
  category: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>
