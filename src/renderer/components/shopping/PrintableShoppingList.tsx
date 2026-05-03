import { createPortal } from 'react-dom'
import { formatCurrency } from '../../lib/utils'
import { SUPERMARKETS } from './types'
import type { ShoppingListWithEntries, SupermarketId } from '../../../shared/types'

interface Props {
  list: ShoppingListWithEntries
}

const SUPER_ORDER: SupermarketId[] = ['mercadona', 'carrefour', 'dia', 'lidl']

/**
 * Versión print-only de la lista de la compra. Se monta en un portal a
 * document.body y queda oculta por defecto (ver `.shop-print-only` en
 * globals.css). Cuando el usuario pulsa imprimir, las reglas @media print
 * ocultan el resto de la app y dejan visible solo este componente.
 *
 * Layout: una sección por super con su color de marca, lista numerada con
 * checkboxes grandes para tachar mientras compras, totales por super y
 * total general al final.
 */
export function PrintableShoppingList({ list }: Props) {
  const groups: Partial<Record<SupermarketId, typeof list.entries>> = {}
  for (const e of list.entries) {
    let sup = e.entry.chosen_supermarket
    if (!sup) {
      const min = e.prices.filter(p => p.available).sort((a, b) => a.price - b.price)[0]
      sup = min?.supermarket ?? 'mercadona'
    }
    (groups[sup] ??= []).push(e)
  }

  const grandTotal = list.entries.reduce((acc, e) => {
    const sup = e.entry.chosen_supermarket
    if (!sup) {
      const min = e.prices.filter(p => p.available).sort((a, b) => a.price - b.price)[0]
      return acc + (min?.price ?? 0) * e.entry.qty
    }
    const p = e.prices.find(x => x.supermarket === sup)
    return acc + (p?.available ? p.price * e.entry.qty : 0)
  }, 0)

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const node = (
    <div className="shop-print-only">
      <header className="shop-print-header">
        <h1>{list.list.name}</h1>
        <p>{today}</p>
      </header>

      {SUPER_ORDER.filter(sp => groups[sp]?.length).map(sp => {
        const entries = groups[sp]!
        const subtotal = entries.reduce((acc, e) => {
          const p = e.prices.find(x => x.supermarket === sp)
          return acc + (p?.available ? p.price * e.entry.qty : 0)
        }, 0)
        return (
          <section key={sp} className="shop-print-group">
            <div className="shop-print-group-head" style={{ borderBottomColor: SUPERMARKETS[sp].color }}>
              <h2 style={{ color: SUPERMARKETS[sp].color }}>{SUPERMARKETS[sp].name}</h2>
              <span className="shop-print-subtotal">{formatCurrency(subtotal)}</span>
            </div>
            <ol className="shop-print-list">
              {entries.map(e => {
                const p = e.prices.find(x => x.supermarket === sp)
                const linePrice = p?.available ? p.price * e.entry.qty : 0
                return (
                  <li key={e.entry.id}>
                    <span className="shop-print-check" aria-hidden="true" />
                    <span className="shop-print-qty">{e.entry.qty}×</span>
                    <span className="shop-print-name">{e.item.name}</span>
                    <span className="shop-print-format">
                      {[e.item.brand, e.item.format].filter(Boolean).join(' · ')}
                    </span>
                    <span className="shop-print-price">{formatCurrency(linePrice)}</span>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}

      <footer className="shop-print-footer">
        <span>Total estimado</span>
        <strong>{formatCurrency(grandTotal)}</strong>
      </footer>
    </div>
  )

  return createPortal(node, document.body)
}
