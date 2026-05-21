'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CreateDebtInput, Debt, UpdateDebtInput } from '../domain/debt.schema'

const KEY = ['debts'] as const

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

export function useDebts() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<Debt[]>('/api/debts'),
  })
}

export function useCreateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDebtInput) =>
      api<Debt>('/api/debts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDebtInput }) =>
      api<Debt>(`/api/debts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/debts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
