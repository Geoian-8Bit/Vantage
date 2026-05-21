'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CreateSavingsInput,
  SavingsAccount,
  UpdateSavingsInput,
} from '../domain/savings.schema'

const KEY = ['savings'] as const

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

export function useSavings() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<SavingsAccount[]>('/api/savings'),
  })
}

export function useCreateSavings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSavingsInput) =>
      api<SavingsAccount>('/api/savings', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateSavings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSavingsInput }) =>
      api<SavingsAccount>(`/api/savings/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteSavings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/savings/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
