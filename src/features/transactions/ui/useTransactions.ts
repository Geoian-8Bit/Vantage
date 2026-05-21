'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from '../domain/transaction.schema'

const KEY = ['transactions'] as const

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
    const err = 'error' in body ? body.error : { message: 'Error desconocido', code: 'unknown' }
    throw new Error(err.message)
  }
  return body.data
}

export function useTransactions() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<Transaction[]>('/api/transactions'),
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      api<Transaction>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionInput }) =>
      api<Transaction>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
