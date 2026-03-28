import { useState, useEffect, useCallback } from 'react'
import type { Category, CreateCategoryDTO } from '../../shared/types'

interface UseCategoriesReturn {
  categories: Category[]
  loading: boolean
  addCategory: (data: CreateCategoryDTO) => Promise<Category>
  removeCategory: (id: string) => Promise<void>
  renameCategory: (id: string, name: string) => Promise<void>
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.categories.getAll()
      .then(cats => setCategories(cats))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const addCategory = useCallback(async (data: CreateCategoryDTO): Promise<Category> => {
    const created = await window.api.categories.create(data)
    setCategories(prev => [...prev, created].sort((a, b) =>
      a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
    ))
    return created
  }, [])

  const removeCategory = useCallback(async (id: string): Promise<void> => {
    await window.api.categories.delete(id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }, [])

  const renameCategory = useCallback(async (id: string, name: string): Promise<void> => {
    const updated = await window.api.categories.update(id, name)
    setCategories(prev => prev.map(c => c.id === id ? updated : c))
  }, [])

  return { categories, loading, addCategory, removeCategory, renameCategory }
}
