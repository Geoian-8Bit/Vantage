import { randomUUID } from 'crypto'
import type { Category, CreateCategoryDTO } from '../../shared/types'
import { getDatabase, saveDatabase } from './schema'

export function getAllCategories(): Category[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM categories ORDER BY type, name')
  const results: Category[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Category
    results.push({
      id:   String(row.id),
      name: String(row.name),
      type: row.type as 'income' | 'expense'
    })
  }
  stmt.free()
  return results
}

export function createCategory(data: CreateCategoryDTO): Category {
  const db = getDatabase()
  const id = randomUUID()
  db.run('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [id, data.name.trim(), data.type])
  saveDatabase()
  return { id, name: data.name.trim(), type: data.type }
}

export function deleteCategory(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM categories WHERE id = ?', [id])
  saveDatabase()
}

export function updateCategory(id: string, name: string): Category {
  const db = getDatabase()
  db.run('UPDATE categories SET name = ? WHERE id = ?', [name.trim(), id])
  saveDatabase()
  const stmt = db.prepare('SELECT * FROM categories WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const row = stmt.getAsObject() as unknown as Category
  stmt.free()
  return { id: String(row.id), name: String(row.name), type: row.type as 'income' | 'expense' }
}
