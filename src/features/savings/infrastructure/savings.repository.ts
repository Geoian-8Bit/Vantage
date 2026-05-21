import 'server-only'

import { and, asc, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { savingsAccounts } from '@/db/schema'

import type {
  CreateSavingsInput,
  SavingsAccount,
  UpdateSavingsInput,
} from '../domain/savings.schema'

function toDomain(row: typeof savingsAccounts.$inferSelect): SavingsAccount {
  return {
    id: row.id,
    spaceId: row.spaceId,
    name: row.name,
    color: row.color,
    targetAmount: row.targetAmount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const savingsRepository = {
  async findAll(spaceId: string): Promise<SavingsAccount[]> {
    const rows = await db
      .select()
      .from(savingsAccounts)
      .where(eq(savingsAccounts.spaceId, spaceId))
      .orderBy(asc(savingsAccounts.name))
    return rows.map(toDomain)
  },

  async create(spaceId: string, input: CreateSavingsInput): Promise<SavingsAccount> {
    const rows = await db
      .insert(savingsAccounts)
      .values({
        spaceId,
        name: input.name,
        color: input.color ?? null,
        targetAmount: input.targetAmount ?? null,
      })
      .returning()
    return toDomain(rows[0]!)
  },

  async update(
    spaceId: string,
    id: string,
    input: UpdateSavingsInput
  ): Promise<SavingsAccount | null> {
    const rows = await db
      .update(savingsAccounts)
      .set({ ...input, updatedAt: sql`now()` })
      .where(and(eq(savingsAccounts.id, id), eq(savingsAccounts.spaceId, spaceId)))
      .returning()
    const row = rows[0]
    return row ? toDomain(row) : null
  },

  async remove(spaceId: string, id: string): Promise<boolean> {
    const rows = await db
      .delete(savingsAccounts)
      .where(and(eq(savingsAccounts.id, id), eq(savingsAccounts.spaceId, spaceId)))
      .returning({ id: savingsAccounts.id })
    return rows.length > 0
  },
}
