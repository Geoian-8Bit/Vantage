'use client'

import { useEffect, useRef, useState } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { originFromElement, type ModalOrigin } from '@/lib/hooks/useModalOrigin'
import { getCategoryColor } from '@/lib/utils/categoryColors'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { resolveSavingsColor } from '@/lib/utils/savingsColors'

import type { SavingsAccount } from '@/features/savings/domain/savings.schema'

import type { Transaction } from '../domain/transaction.schema'

interface TransactionListProps {
  transactions: Transaction[]
  onDelete: (id: string, origin?: ModalOrigin) => void
  onEdit: (transaction: Transaction, origin?: ModalOrigin) => void
  emptyMessage?: string
  listKey?: string
  removingIds?: Set<string>
  hasActiveFilter?: boolean
  onClearFilters?: () => void
  flashIds?: Set<string>
  /** Apartados conocidos para resolver savingsAccountId → nombre + color */
  savingsAccounts?: SavingsAccount[]
}

export function TransactionList({
  transactions,
  onDelete,
  onEdit,
  emptyMessage = 'No hay transacciones',
  listKey,
  removingIds,
  hasActiveFilter,
  onClearFilters,
  flashIds,
  savingsAccounts,
}: TransactionListProps) {
  const savingsById = new Map((savingsAccounts ?? []).map((a) => [a.id, a]))
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())
  const knownIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const currentIds = new Set(transactions.map((t) => t.id))
    const newIds: string[] = []
    for (const id of currentIds) {
      if (!knownIdsRef.current.has(id) && knownIdsRef.current.size > 0) {
        newIds.push(id)
      }
    }
    knownIdsRef.current = currentIds
    if (newIds.length > 0) {
      // Sincronización legítima con cambio en prop externa (transactions): añade
      // ids recién aparecidos al set de highlight y los limpia tras 1.6s.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightedIds((prev) => {
        const next = new Set(prev)
        newIds.forEach((id) => next.add(id))
        return next
      })
      const timer = setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev)
          newIds.forEach((id) => next.delete(id))
          return next
        })
      }, 1600)
      return () => clearTimeout(timer)
    }
  }, [transactions])

  if (transactions.length === 0) {
    if (hasActiveFilter) {
      return (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            }
            title="Ningún movimiento coincide"
            description="Prueba a cambiar el periodo, la categoría o el texto de búsqueda."
            action={
              onClearFilters && (
                <button
                  onClick={onClearFilters}
                  className="cursor-pointer rounded-xl bg-brand-light px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  Limpiar filtros
                </button>
              )
            }
          />
        </div>
      )
    }
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <EmptyState
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          title={emptyMessage}
          description='Pulsa «+ Gasto» o «+ Ingreso» en la cabecera para empezar'
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="hidden grid-cols-[minmax(0,1fr)_140px_110px_140px_88px] border-b border-border bg-surface px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-subtext md:grid">
        <span>Descripción · Nota</span>
        <span>Categoría</span>
        <span className="text-right">Fecha</span>
        <span className="text-right">Cantidad</span>
        <span className="pr-1 text-right">Acciones</span>
      </div>

      <div className="divide-y divide-border/40">
        {transactions.map((transaction, idx) => {
          const style = getCategoryColor(transaction.category)
          const isIncome = transaction.type === 'income'
          const amountNum = Number(transaction.amount)

          const pmMatch = transaction.note?.match(/^\[(\w+)\]\s?(.*)/)
          const method = pmMatch?.[1]
          const noteRest = pmMatch ? pmMatch[2] : (transaction.note ?? '')

          const isHighlighted =
            highlightedIds.has(transaction.id) || flashIds?.has(transaction.id)
          const isRemoving = removingIds?.has(transaction.id)

          const iconBlock = (
            <div
              aria-label={isIncome ? 'Ingreso' : 'Gasto'}
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                isIncome ? 'bg-income-light' : 'bg-expense-light'
              }`}
              style={{
                boxShadow: isIncome
                  ? '0 2px 8px color-mix(in srgb, var(--color-income) 20%, transparent)'
                  : '0 2px 8px color-mix(in srgb, var(--color-expense) 20%, transparent)',
              }}
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isIncome ? 'text-income' : 'text-expense'}
              >
                {isIncome ? (
                  <path d="M12 19V5M5 12l7-7 7 7" />
                ) : (
                  <path d="M12 5v14M5 12l7 7 7-7" />
                )}
              </svg>
            </div>
          )

          const descBlock = (
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span
                  className="truncate text-sm font-semibold text-text"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {transaction.description || (isIncome ? 'Ingreso' : 'Gasto')}
                </span>
                {method && (
                  <span className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-subtext">
                    {method}
                  </span>
                )}
                {transaction.savingsAccountId &&
                  savingsById.has(transaction.savingsAccountId) &&
                  (() => {
                    const acc = savingsById.get(transaction.savingsAccountId)!
                    const accent = resolveSavingsColor(acc.color)
                    return (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                          color: accent,
                        }}
                        title={
                          isIncome ? 'Retirada del apartado' : 'Aportación al apartado'
                        }
                      >
                        {isIncome ? '←' : '→'} {acc.name}
                      </span>
                    )
                  })()}
                {transaction.attachmentPath && (
                  <span
                    className="inline-flex shrink-0 items-center justify-center rounded p-0.5 text-subtext"
                    title="Tiene foto del ticket adjunta"
                    aria-label="Con ticket adjunto"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.99 8.8l-8.58 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </span>
                )}
              </div>
              {noteRest && (
                <p
                  className="whitespace-pre-wrap break-words text-[12px] leading-snug text-subtext"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                  title={noteRest}
                >
                  {noteRest}
                </p>
              )}
            </div>
          )

          const categoryChip = (
            <span
              className="inline-flex w-fit items-center gap-1.5 truncate whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                background: style.background,
                color: style.text,
                border: `1px solid ${style.border}`,
              }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: style.base }}
              />
              {transaction.category}
            </span>
          )

          const amountElement = (
            <span
              className={`text-base tabular-nums ${isIncome ? 'text-income' : 'text-expense'}`}
              style={{
                fontFamily: 'var(--font-display)',
                letterSpacing: 'var(--letter-spacing-display)',
              }}
            >
              {isIncome ? '+' : '−'}
              {formatCurrency(Math.abs(amountNum))}
            </span>
          )

          const actionsBlock = (
            <>
              <button
                onClick={(e) => onEdit(transaction, originFromElement(e.currentTarget))}
                aria-label={`Editar ${transaction.description || (isIncome ? 'ingreso' : 'gasto')}`}
                title="Editar"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-surface/60 text-subtext transition-colors hover:bg-brand-light hover:text-brand sm:h-8 sm:w-8"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={(e) => onDelete(transaction.id, originFromElement(e.currentTarget))}
                aria-label={`Eliminar ${transaction.description || (isIncome ? 'ingreso' : 'gasto')}`}
                title="Eliminar"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-surface/60 text-subtext transition-colors hover:bg-expense-light hover:text-expense sm:h-8 sm:w-8"
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </>
          )

          return (
            <div
              key={listKey ? `${listKey}-${transaction.id}` : transaction.id}
              data-stagger={idx % 8}
              className={`tx-row group relative transition-colors hover:bg-surface/50 ${
                isHighlighted ? 'tx-row-flash' : ''
              } ${isRemoving ? 'tx-row-removing' : ''}`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-2 left-0 top-2 w-1 rounded-r-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background: isIncome ? 'var(--color-income)' : 'var(--color-expense)',
                }}
              />

              {/* Layout móvil: dos filas — desc+amount arriba, meta+acciones abajo */}
              <div className="flex flex-col gap-2 px-4 py-3 md:hidden">
                <div className="flex items-start gap-3">
                  {iconBlock}
                  {descBlock}
                  <div className="shrink-0 text-right">{amountElement}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-12">
                  {categoryChip}
                  <span className="text-xs tabular-nums text-subtext">
                    {formatDate(transaction.date)}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">{actionsBlock}</div>
                </div>
              </div>

              {/* Layout desktop: grid 5 columnas como antes */}
              <div className="hidden grid-cols-[minmax(0,1fr)_140px_110px_140px_88px] items-center px-5 py-3.5 md:grid">
                <div className="flex min-w-0 items-start gap-3 pr-3">
                  {iconBlock}
                  {descBlock}
                </div>
                {categoryChip}
                <span className="text-right text-sm tabular-nums text-subtext">
                  {formatDate(transaction.date)}
                </span>
                <span className="text-right">{amountElement}</span>
                <div className="flex items-center justify-end gap-1.5">{actionsBlock}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
