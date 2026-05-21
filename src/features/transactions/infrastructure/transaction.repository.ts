import 'server-only'

import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { transactions } from '@/db/schema'

import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  Transaction,
  UpdateTransactionInput,
} from '../domain/transaction.schema'

function toDomain(row: typeof transactions.$inferSelect): Transaction {
  return {
    id: row.id,
    spaceId: row.spaceId,
    amount: row.amount,
    type: row.type,
    description: row.description,
    note: row.note,
    date: row.date,
    category: row.category,
    categoryId: row.categoryId,
    savingsAccountId: row.savingsAccountId,
    debtId: row.debtId,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const transactionRepository = {
  async findAll(spaceId: string, query: ListTransactionsQuery): Promise<Transaction[]> {
    const conditions = [eq(transactions.spaceId, spaceId)]
    if (query.type) conditions.push(eq(transactions.type, query.type))
    if (query.category) conditions.push(eq(transactions.category, query.category))
    if (query.categoryId) conditions.push(eq(transactions.categoryId, query.categoryId))
    if (query.fromDate) conditions.push(gte(transactions.date, query.fromDate))
    if (query.toDate) conditions.push(lte(transactions.date, query.toDate))

    const rows = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(query.limit)
      .offset(query.offset)

    return rows.map(toDomain)
  },

  async findById(spaceId: string, id: string): Promise<Transaction | null> {
    const rows = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.spaceId, spaceId)))
      .limit(1)
    const row = rows[0]
    return row ? toDomain(row) : null
  },

  async create(
    spaceId: string,
    userId: string,
    input: CreateTransactionInput
  ): Promise<Transaction> {
    const rows = await db
      .insert(transactions)
      .values({
        spaceId,
        createdBy: userId,
        amount: input.amount,
        type: input.type,
        description: input.description,
        note: input.note ?? '',
        date: input.date,
        category: input.category ?? 'Otros',
        categoryId: input.categoryId ?? null,
        savingsAccountId: input.savingsAccountId ?? null,
        debtId: input.debtId ?? null,
      })
      .returning()
    return toDomain(rows[0]!)
  },

  async update(
    spaceId: string,
    id: string,
    input: UpdateTransactionInput
  ): Promise<Transaction | null> {
    const rows = await db
      .update(transactions)
      .set({
        ...input,
        updatedAt: sql`now()`,
      })
      .where(and(eq(transactions.id, id), eq(transactions.spaceId, spaceId)))
      .returning()
    const row = rows[0]
    return row ? toDomain(row) : null
  },

  async remove(spaceId: string, id: string): Promise<boolean> {
    const rows = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.spaceId, spaceId)))
      .returning({ id: transactions.id })
    return rows.length > 0
  },
}
