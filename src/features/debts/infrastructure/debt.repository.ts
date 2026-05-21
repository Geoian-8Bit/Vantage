import 'server-only'

import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { debts } from '@/db/schema'

import type { CreateDebtInput, Debt, UpdateDebtInput } from '../domain/debt.schema'

function toDomain(row: typeof debts.$inferSelect): Debt {
  return {
    id: row.id,
    spaceId: row.spaceId,
    name: row.name,
    creditor: row.creditor,
    color: row.color,
    initialAmount: row.initialAmount,
    monthlyAmount: row.monthlyAmount,
    startDate: row.startDate,
    recurringId: row.recurringId,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const debtRepository = {
  async findAll(spaceId: string): Promise<Debt[]> {
    const rows = await db
      .select()
      .from(debts)
      .where(eq(debts.spaceId, spaceId))
      .orderBy(desc(debts.createdAt))
    return rows.map(toDomain)
  },

  async create(spaceId: string, input: CreateDebtInput): Promise<Debt> {
    const rows = await db
      .insert(debts)
      .values({
        spaceId,
        name: input.name,
        creditor: input.creditor ?? null,
        color: input.color ?? null,
        initialAmount: input.initialAmount,
        monthlyAmount: input.monthlyAmount,
        startDate: input.startDate,
        notes: input.notes ?? null,
      })
      .returning()
    return toDomain(rows[0]!)
  },

  async update(spaceId: string, id: string, input: UpdateDebtInput): Promise<Debt | null> {
    const { archivedAt, ...rest } = input
    const archivedDate =
      archivedAt === undefined ? undefined : archivedAt === null ? null : new Date(archivedAt)
    const rows = await db
      .update(debts)
      .set({
        ...rest,
        ...(archivedDate !== undefined ? { archivedAt: archivedDate } : {}),
        updatedAt: sql`now()`,
      })
      .where(and(eq(debts.id, id), eq(debts.spaceId, spaceId)))
      .returning()
    const row = rows[0]
    return row ? toDomain(row) : null
  },

  async remove(spaceId: string, id: string): Promise<boolean> {
    const rows = await db
      .delete(debts)
      .where(and(eq(debts.id, id), eq(debts.spaceId, spaceId)))
      .returning({ id: debts.id })
    return rows.length > 0
  },
}
