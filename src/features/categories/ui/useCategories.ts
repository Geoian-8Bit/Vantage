'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../domain/category.schema'

const KEY = ['categories'] as const

const DEFAULTS: Category[] = [
  { id: 'default-exp-alimentacion', spaceId: '', name: 'Alimentación', type: 'expense', createdAt: '' },
  { id: 'default-exp-transporte', spaceId: '', name: 'Transporte', type: 'expense', createdAt: '' },
  { id: 'default-exp-alquiler', spaceId: '', name: 'Alquiler', type: 'expense', createdAt: '' },
  { id: 'default-exp-ocio', spaceId: '', name: 'Ocio', type: 'expense', createdAt: '' },
  { id: 'default-exp-salud', spaceId: '', name: 'Salud', type: 'expense', createdAt: '' },
  { id: 'default-exp-ropa', spaceId: '', name: 'Ropa', type: 'expense', createdAt: '' },
  { id: 'default-exp-servicios', spaceId: '', name: 'Servicios', type: 'expense', createdAt: '' },
  { id: 'default-exp-otros', spaceId: '', name: 'Otros', type: 'expense', createdAt: '' },
  { id: 'default-inc-nomina', spaceId: '', name: 'Nómina', type: 'income', createdAt: '' },
  { id: 'default-inc-bizum', spaceId: '', name: 'Bizum', type: 'income', createdAt: '' },
  { id: 'default-inc-regalo', spaceId: '', name: 'Regalo', type: 'income', createdAt: '' },
  { id: 'default-inc-inversion', spaceId: '', name: 'Inversión', type: 'income', createdAt: '' },
]

interface ApiOk<T> {
  data: T
}
interface ApiErr {
  error: { code: string; message: string; issues?: unknown }
}

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const body = (await res.json()) as ApiOk<T> | ApiErr
  if (!res.ok || 'error' in body) {
    const err = 'error' in body ? body.error : { message: 'Error', code: 'unknown' }
    throw new Error(err.message)
  }
  return body.data
}

function mergeWithDefaults(custom: Category[]): Category[] {
  const customNames = new Set(custom.map((c) => `${c.type}:${c.name}`))
  const filteredDefaults = DEFAULTS.filter((d) => !customNames.has(`${d.type}:${d.name}`))
  return [...filteredDefaults, ...custom]
}

export function useCategories() {
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => api<Category[]>('/api/categories'),
  })

  return {
    categories: mergeWithDefaults(query.data ?? []),
    loading: query.isLoading,
    error: query.error as Error | null,
  }
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      api<Category>('/api/categories', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      api<Category>(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<{ ok: true }>(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
