import 'server-only'

import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { categories } from '@/db/schema'

import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../domain/category.schema'

function toDomain(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    spaceId: row.spaceId,
    name: row.name,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
  }
}

export const categoryRepository = {
  async findAll(spaceId: string): Promise<Category[]> {
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.spaceId, spaceId))
      .orderBy(asc(categories.type), asc(categories.name))
    return rows.map(toDomain)
  },

  async create(spaceId: string, input: CreateCategoryInput): Promise<Category> {
    const rows = await db
      .insert(categories)
      .values({ spaceId, name: input.name, type: input.type })
      .returning()
    return toDomain(rows[0]!)
  },

  async update(spaceId: string, id: string, input: UpdateCategoryInput): Promise<Category | null> {
    const rows = await db
      .update(categories)
      .set(input)
      .where(and(eq(categories.id, id), eq(categories.spaceId, spaceId)))
      .returning()
    const row = rows[0]
    return row ? toDomain(row) : null
  },

  async remove(spaceId: string, id: string): Promise<boolean> {
    const rows = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.spaceId, spaceId)))
      .returning({ id: categories.id })
    return rows.length > 0
  },
}
