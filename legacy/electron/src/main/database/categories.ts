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
  const trimmed = data.name.trim()

  // Check for duplicate name+type
  const check = db.prepare('SELECT COUNT(*) as cnt FROM categories WHERE name = ? AND type = ?')
  check.bind([trimmed, data.type])
  check.step()
  const exists = Number((check.getAsObject() as { cnt: number }).cnt) > 0
  check.free()
  if (exists) {
    throw new Error(`Ya existe una categoría "${trimmed}" de tipo ${data.type === 'income' ? 'ingreso' : 'gasto'}`)
  }

  const id = randomUUID()
  db.run('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [id, trimmed, data.type])
  saveDatabase()
  return { id, name: trimmed, type: data.type }
}

export function deleteCategory(id: string): void {
  const db = getDatabase()

  // Find the category name before deleting so we can reassign orphaned records
  const stmt = db.prepare('SELECT name, type FROM categories WHERE id = ?')
  stmt.bind([id])
  if (stmt.step()) {
    const row = stmt.getAsObject() as { name: string; type: string }
    const catName = String(row.name)
    const catType = String(row.type)
    stmt.free()

    // Reassign transactions with this category to "Otros" (expense) or "Sin categoría" (income)
    const fallback = catType === 'expense' ? 'Otros' : 'Sin categoría'
    db.run('UPDATE transactions SET category = ? WHERE category = ?', [fallback, catName])
    db.run('UPDATE recurring_templates SET category = ? WHERE category = ? AND type = ?', [fallback, catName, catType])
  } else {
    stmt.free()
  }

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
