import { useEffect, useRef, useState } from 'react'
import { Modal } from '../Modal'
import { SupermarketChip } from './SupermarketChip'
import { PriceTag } from './PriceTag'
import type { ScrapedProductCandidate, ScrapeSearchResult } from '../../repositories/ShoppingRepository'
import type { SupermarketId } from '../../../shared/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string) => Promise<ScrapeSearchResult[]>
  onAdd: (scraped: ScrapedProductCandidate, supermarket: SupermarketId) => Promise<void>
}

/** Solo se muestran supers con scraper funcional. Carrefour y Lidl quedan
 *  fuera hasta que se resuelva su integración (Akamai / folleto). */
const SUPER_ORDER: SupermarketId[] = ['mercadona', 'dia']
const DEBOUNCE_MS = 450

/**
 * Modal de búsqueda en los supermercados reales. El usuario escribe un
 * término ("leche semidesnatada"), debounce 450ms, y se dispara una búsqueda
 * paralela en los supers configurados. Los resultados aparecen agrupados por
 * super en columnas; click en "+" añade ese producto al catálogo del usuario
 * (con su SKU real) y registra el primer snapshot.
 */
export function SearchInSupersModal({ isOpen, onClose, onSearch, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ScrapeSearchResult[]>([])
  const [adding, setAdding] = useState<string | null>(null)  // sku que se está añadiendo
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const seqRef = useRef(0)  // para descartar respuestas viejas si el query cambia

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setErrorMsg(null)
    }
  }, [isOpen])

  // Debounce + buscar
  useEffect(() => {
    if (!isOpen) return
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    const my = ++seqRef.current
    const t = window.setTimeout(async () => {
      try {
        setLoading(true)
        setErrorMsg(null)
        const data = await onSearch(query.trim())
        if (my !== seqRef.current) return  // hubo otro query más nuevo, descartar
        setResults(data)
      } catch (err) {
        if (my !== seqRef.current) return
        setErrorMsg(err instanceof Error ? err.message : 'Error al buscar')
        setResults([])
      } finally {
        if (my === seqRef.current) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query, isOpen, onSearch])

  const handleAdd = async (scraped: ScrapedProductCandidate, supermarket: SupermarketId) => {
    setAdding(scraped.sku)
    try {
      await onAdd(scraped, supermarket)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo añadir el producto')
    } finally {
      setAdding(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buscar productos en supermercados" size="xl">
      <div data-module="shopping" className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <svg
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-subtext pointer-events-none"
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="leche semidesnatada, plátanos, aceite oliva…"
            className="w-full pl-12 pr-12 py-3 rounded-xl bg-surface border border-border text-base text-text placeholder:text-subtext focus:outline-none"
          />
          {loading && (
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--shop-primary)', borderTopColor: 'transparent' }}
            />
          )}
        </div>

        {errorMsg && (
          <p className="text-xs text-error px-1">{errorMsg}</p>
        )}

        {/* Resultados por super */}
        {query.trim().length < 2 ? (
          <p className="text-sm text-subtext text-center py-12">
            Escribe al menos 2 letras para buscar.
            <br />
            <span className="text-xs">
              Búsqueda en vivo en Mercadona y Dia. Carrefour y Lidl están en construcción.
            </span>
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SUPER_ORDER.map(sp => {
              const block = results.find(r => r.supermarket === sp)
              const items = block?.results ?? []
              return (
                <div key={sp} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-surface/40 shrink-0">
                    <SupermarketChip id={sp} variant="dot" size="sm" />
                    <span className="text-[10px] text-subtext font-semibold tabular-nums">
                      {loading ? '…' : `${items.length} ${items.length === 1 ? 'resultado' : 'resultados'}`}
                    </span>
                  </div>
                  <div className="flex-1 min-h-[160px] overflow-y-auto">
                    {block?.error ? (
                      <p className="text-xs text-subtext italic px-3 py-4 text-center">Error: {block.error}</p>
                    ) : items.length === 0 ? (
                      <p className="text-xs text-subtext italic px-3 py-6 text-center">
                        {loading ? 'Buscando…' : 'Sin resultados'}
                      </p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {items.map(p => (
                          <li key={p.sku} className="px-3 py-3 flex items-start gap-2.5 hover:bg-surface/60">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt=""
                                loading="lazy"
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-surface border border-border"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg shrink-0 bg-surface border border-border flex items-center justify-center text-subtext text-[10px]">
                                sin foto
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs font-semibold text-text leading-snug line-clamp-2">{p.name}</p>
                              <p className="text-[10px] text-subtext truncate">
                                {[p.brand, p.format].filter(Boolean).join(' · ') || p.category}
                              </p>
                              <div className="flex items-baseline gap-1.5">
                                <PriceTag price={p.price} size="sm" />
                                {p.unitPrice && p.unitPrice > 0 && (
                                  <span className="text-[10px] text-subtext tabular-nums">
                                    ({p.unitPrice.toFixed(2)} €/{p.format ?? 'ud'})
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAdd(p, sp)}
                              disabled={adding === p.sku}
                              aria-label={`Añadir ${p.name} al catálogo`}
                              className="shrink-0 inline-flex items-center justify-center rounded-full text-white cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                              style={{
                                width: 30, height: 30,
                                background: 'var(--shop-primary)',
                                boxShadow: '0 2px 6px color-mix(in srgb, var(--shop-primary) 40%, transparent)',
                              }}
                            >
                              {adding === p.sku ? (
                                <span
                                  className="w-3 h-3 rounded-full border-2 animate-spin"
                                  style={{ borderColor: 'white', borderTopColor: 'transparent' }}
                                />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 12h14" /><path d="M12 5v14" />
                                </svg>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
