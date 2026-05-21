'use client'

import { useState } from 'react'

import type { Transaction, TxType } from '../domain/transaction.schema'
import { useCreateTransaction, useUpdateTransaction } from './useTransactions'

interface Props {
  initial?: Transaction
  onDone?: () => void
}

export function TransactionForm({ initial, onDone }: Props) {
  const create = useCreateTransaction()
  const update = useUpdateTransaction()
  const isEditing = !!initial

  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  const isSubmitting = create.isPending || update.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input = { type, amount, description, note, date }
    try {
      if (isEditing && initial) {
        await update.mutateAsync({ id: initial.id, input })
      } else {
        await create.mutateAsync(input)
      }
      if (!isEditing) {
        setAmount('')
        setDescription('')
        setNote('')
      }
      onDone?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
        {isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}
      </h2>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
            type === 'expense'
              ? 'bg-red-500/20 text-red-200 ring-1 ring-red-500/50'
              : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 rounded-md px-3 py-2 text-sm transition ${
            type === 'income'
              ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/50'
              : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Ingreso
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Importe</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Fecha</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-400">Descripción</label>
        <input
          type="text"
          required
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej. Compra supermercado"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-neutral-400">Nota (opcional)</label>
        <textarea
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full resize-none rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Añadir'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
