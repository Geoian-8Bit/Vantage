'use client'

import { useState } from 'react'

import type { Transaction } from '../domain/transaction.schema'
import { TransactionForm } from './TransactionForm'
import { useDeleteTransaction, useTransactions } from './useTransactions'

const formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function TransactionList() {
  const { data, isLoading, error } = useTransactions()
  const remove = useDeleteTransaction()
  const [editing, setEditing] = useState<Transaction | null>(null)

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Cargando movimientos...</p>
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">
        Error al cargar movimientos: {error instanceof Error ? error.message : 'desconocido'}
      </p>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center">
        <p className="text-sm text-neutral-400">Aún no tienes movimientos.</p>
        <p className="mt-1 text-xs text-neutral-600">
          Añade el primero con el formulario de arriba.
        </p>
      </div>
    )
  }

  if (editing) {
    return (
      <TransactionForm
        initial={editing}
        onDone={() => setEditing(null)}
      />
    )
  }

  return (
    <ul className="divide-y divide-neutral-800 overflow-hidden rounded-lg border border-neutral-800">
      {data.map((tx) => {
        const isIncome = tx.type === 'income'
        return (
          <li key={tx.id} className="flex items-center gap-4 bg-neutral-900 p-3 hover:bg-neutral-900/70">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                isIncome
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
              aria-hidden
            >
              {isIncome ? '+' : '−'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-100">{tx.description}</p>
              <p className="text-xs text-neutral-500">
                {dateFormatter.format(new Date(tx.date))}
              </p>
            </div>
            <p
              className={`text-sm font-semibold tabular-nums ${
                isIncome ? 'text-emerald-300' : 'text-red-300'
              }`}
            >
              {isIncome ? '+' : '−'}
              {formatter.format(Math.abs(Number(tx.amount)))}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setEditing(tx)}
                className="rounded px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  if (confirm('¿Borrar este movimiento?')) remove.mutate(tx.id)
                }}
                disabled={remove.isPending}
                className="rounded px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                Borrar
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
