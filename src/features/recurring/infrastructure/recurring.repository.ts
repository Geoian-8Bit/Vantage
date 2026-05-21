import 'server-only'

import { and, asc, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { recurringTemplates } from '@/db/schema'

import type {
  CreateRecurringInput,
  RecurringTemplate,
  UpdateRecurringInput,
} from '../domain/recurring.schema'

function toDomain(row: typeof recurringTemplates.$inferSelect): RecurringTemplate {
  return {
    id: row.id,
    spaceId: row.spaceId,
    amount: row.amount,
    type: row.type,
    description: row.description,
    categoryId: row.categoryId,
    frequency: row.frequency,
    nextDate: row.nextDate,
    active: row.active,
    debtId: row.debtId,
    savingsAccountId: row.savingsAccountId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const recurringRepository = {
  async findAll(spaceId: string): Promise<RecurringTemplate[]> {
    const rows = await db
      .select()
      .from(recurringTemplates)
      .where(eq(recurringTemplates.spaceId, spaceId))
      .orderBy(asc(recurringTemplates.nextDate))
    return rows.map(toDomain)
  },

  async create(spaceId: string, input: CreateRecurringInput): Promise<RecurringTemplate> {
    const rows = await db
      .insert(recurringTemplates)
      .values({
        spaceId,
        amount: input.amount,
        type: input.type,
        description: input.description,
        categoryId: input.categoryId ?? null,
        frequency: input.frequency,
        nextDate: input.nextDate,
        active: input.active ?? true,
      })
      .returning()
    return toDomain(rows[0]!)
  },

  async update(
    spaceId: string,
    id: string,
    input: UpdateRecurringInput
  ): Promise<RecurringTemplate | null> {
    const rows = await db
      .update(recurringTemplates)
      .set({ ...input, updatedAt: sql`now()` })
      .where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.spaceId, spaceId)))
      .returning()
    const row = rows[0]
    return row ? toDomain(row) : null
  },

  async remove(spaceId: string, id: string): Promise<boolean> {
    const rows = await db
      .delete(recurringTemplates)
      .where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.spaceId, spaceId)))
      .returning({ id: recurringTemplates.id })
    return rows.length > 0
  },
}
