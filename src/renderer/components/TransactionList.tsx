import { useEffect, useRef, useState } from 'react'
import type { Transaction } from '../../shared/types'
import { formatCurrency, formatDate } from '../lib/utils'
import { getCategoryColor } from '../lib/categoryColors'
import { EmptyState } from './EmptyState'
import { originFromElement, type ModalOrigin } from '../hooks/useModalOrigin'

interface TransactionListProps {
  transactions: Transaction[]
  onDelete: (id: string, origin?: ModalOrigin) => void
  onEdit: (transaction: Transaction, origin?: ModalOrigin) => void
  emptyMessage?: string
  /** Cambia para forzar remount de las filas (al cambiar filtro/página/búsqueda) */
  listKey?: string
  /** Ids en proceso de eliminación: animan colapso antes de desaparecer del array */
  removingIds?: Set<string>
  /** True si hay filtros activos (search, category, type) que están reduciendo
   * el conjunto. Cambia el empty state a "tu filtro no encontró nada" y ofrece
   * una acción para limpiar. */
  hasActiveFilter?: boolean
  /** Callback opcional para limpiar todos los filtros activos. */
  onClearFilters?: () => void
  /** Ids recién editados externamente (desde el padre). Se les aplica el mismo
   * tx-flash que a los nuevos durante 1.6s para señalar "esta cambió". */
  flashIds?: Set<string>
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
}: TransactionListProps) {
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())
  const knownIdsRef = useRef<Set<string>>(new Set())

  // Detectar ids nuevos al re-renderizar para flash de highlight
  useEffect(() => {
    const currentIds = new Set(transactions.map(t => t.id))
    const newIds: string[] = []
    for (const id of currentIds) {
      if (!knownIdsRef.current.has(id) && knownIdsRef.current.size > 0) {
        // Solo highlight si NO es la primera carga (skip todos al primer mount)
        newIds.push(id)
      }
    }
    knownIdsRef.current = currentIds
    if (newIds.length > 0) {
      setHighlightedIds(prev => {
        const next = new Set(prev)
        newIds.forEach(id => next.add(id))
        return next
      })
      // Quitar highlight tras 1.6s
      const timer = setTimeout(() => {
        setHighlightedIds(prev => {
          const next = new Set(prev)
          newIds.forEach(id => next.delete(id))
          return next
        })
      }, 1600)
      return () => clearTimeout(timer)
    }
  }, [transactions])

  if (transactions.length === 0) {
    // Diferenciamos: filtro activo sin resultados ≠ no hay datos en absoluto.
    // El primer caso es transitorio (acción del usuario), el segundo invita a crear.
    if (hasActiveFilter) {
      return (
        <div className="rounded-xl bg-card shadow-sm border border-border">
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            }
            title="Ningún movimiento coincide"
            description="Prueba a cambiar el periodo, la categoría o el texto de búsqueda."
            action={onClearFilters && (
              <button
                onClick={onClearFilters}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-brand bg-brand-light hover:bg-brand hover:text-white transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          />
        </div>
      )
    }
    return (
      <div className="rounded-xl bg-card shadow-sm border border-border">
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          title={emptyMessage}
          description='Pulsa «+ Gasto» o «+ Ingreso» en el botón superior para empezar'
        />
      </div>
    )
  }

  // Data arrives pre-sorted from DB (date DESC) and pre-sliced by pagination
  return (
    <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_140px_110px_140px_88px] px-5 py-3 border-b border-border bg-surface text-[11px] font-semibold text-subtext uppercase tracking-wider">
        <span>Descripción · Nota</span>
        <span>Categoría</span>
        <span className="text-right">Fecha</span>
        <span className="text-right">Cantidad</span>
        <span className="text-right pr-1">Acciones</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/40">
        {transactions.map((transaction, idx) => {
          const style = getCategoryColor(transaction.category)
          const isIncome = transaction.type === 'income'

          // Parse note prefix
          const pmMatch = transaction.note?.match(/^\[(\w+)\]\s?(.*)/)
          const method = pmMatch?.[1]
          const noteRest = pmMatch ? pmMatch[2] : transaction.note ?? ''

          const isHighlighted = highlightedIds.has(transaction.id) || flashIds?.has(transaction.id)
          const isRemoving = removingIds?.has(transaction.id)

          return (
            <div
              key={listKey ? `${listKey}-${transaction.id}` : transaction.id}
              data-stagger={idx % 8}
              className={`tx-row group relative grid grid-cols-[minmax(0,1fr)_140px_110px_140px_88px] items-center px-5 py-3.5 transition-colors hover:bg-surface/50 ${
                isHighlighted ? 'tx-row-flash' : ''
              } ${isRemoving ? 'tx-row-removing' : ''}`}
            >
              {/* Tira de color a la izquierda según tipo (visible en hover) */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: isIncome ? 'var(--color-income)' : 'var(--color-expense)' }}
              />

              {/* Descripción + nota inline */}
              <div className="flex items-start gap-3 min-w-0 pr-3">
                <div
                  aria-label={isIncome ? 'Ingreso' : 'Gasto'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${isIncome ? 'bg-income-light' : 'bg-expense-light'}`}
                  style={{
                    boxShadow: isIncome
                      ? '0 2px 8px color-mix(in srgb, var(--color-income) 20%, transparent)'
                      : '0 2px 8px color-mix(in srgb, var(--color-expense) 20%, transparent)',
                  }}
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isIncome ? 'text-income' : 'text-expense'}>
                    {isIncome
                      ? <path d="M12 19V5M5 12l7-7 7 7" />
                      : <path d="M12 5v14M5 12l7 7 7-7" />
                    }
                  </svg>
                </div>
                <div className="flex flex-col min-w-0 gap-0.5 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-semibold text-text truncate" style={{ fontFamily: 'var(--font-body)' }}>
                      {transaction.description || (isIncome ? 'Ingreso' : 'Gasto')}
                    </span>
                    {method && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-income-light text-income">
                        {method}
                      </span>
                    )}
                  </div>
                  {noteRest && (
                    <p
                      className="text-[12px] text-subtext leading-snug whitespace-pre-wrap break-words"
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
              </div>

              {/* Category */}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit whitespace-nowrap truncate"
                style={{
                  background: style.background,
                  color: style.text,
                  border: `1px solid ${style.border}`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.base }} />
                {transaction.category}
              </span>

              {/* Date */}
              <span className="text-sm text-subtext text-right tabular-nums">
                {formatDate(transaction.date)}
              </span>

              {/* Amount */}
              <span
                className={`text-base text-right tabular-nums ${isIncome ? 'text-income' : 'text-expense'}`}
                style={{ fontFamily: 'var(--font-display)', letterSpacing: 'var(--letter-spacing-display)' }}
              >
                {(transaction.amount >= 0) === isIncome ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount))}
              </span>

              {/* Acciones inline siempre visibles */}
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={(e) => onEdit(transaction, originFromElement(e.currentTarget))}
                  aria-label={`Editar ${transaction.description || (isIncome ? 'ingreso' : 'gasto')}`}
                  title="Editar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-subtext bg-surface/60 hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => onDelete(transaction.id, originFromElement(e.currentTarget))}
                  aria-label={`Eliminar ${transaction.description || (isIncome ? 'ingreso' : 'gasto')}`}
                  title="Eliminar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-subtext bg-surface/60 hover:bg-expense-light hover:text-expense transition-colors cursor-pointer"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
