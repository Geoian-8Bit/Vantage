'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CreateRecurringInput,
  RecurringTemplate,
  UpdateRecurringInput,
} from '../domain/recurring.schema'

const KEY = ['recurring'] as const

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

export function useRecurring() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<RecurringTemplate[]>('/api/recurring'),
  })
}

export function useCreateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRecurringInput) =>
      api<RecurringTemplate>('/api/recurring', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecurringInput }) =>
      api<RecurringTemplate>(`/api/recurring/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/recurring/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
