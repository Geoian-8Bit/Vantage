import { useRef, type MouseEvent } from 'react'
import { PriceTag } from './PriceTag'
import { SparklineMini } from './SparklineMini'
import { useFlyToCart } from './FlyToCart'
import { SUPERMARKET_ORDER, getMinPrice, getTrend, type ShoppingProduct } from './types'

interface Props {
  product: ShoppingProduct
  onClick?: (p: ShoppingProduct) => void
  onAdd?: (p: ShoppingProduct) => void
  /** Watchlist: si está seguido, aparece el bookmark relleno en top-left */
  tracked?: boolean
  onToggleTrack?: (p: ShoppingProduct) => void
  /** Para stagger entry — el screen padre asigna el índice */
  index?: number
}

/**
 * Card del catálogo. Foto / placeholder, nombre+formato, precio mínimo
 * con marca de mejor super, dots de disponibilidad por super, sparkline
 * mini con tendencia. El botón "+" añade al carrito con animación fly.
 *
 * Hover (teclado y ratón): card sube 3px, sombra crece, aparece el botón
 * "+ Añadir" con scale-in.
 */
export function ProductCard({ product, onClick, onAdd, tracked, onToggleTrack, index = 0 }: Props) {
  const min = getMinPrice(product)
  const trend = getTrend(product.history)
  const historyValues = product.history
    .map(pt => {
      const vals = Object.values(pt.prices).filter((v): v is number => typeof v === 'number')
      return vals.length === 0 ? null : Math.min(...vals)
    })
    .filter((v): v is number => v !== null)

  const cardRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const { fly } = useFlyToCart()

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation()
    fly(imageRef.current ?? cardRef.current)
    onAdd?.(product)
  }

  return (
    <div
      ref={cardRef}
      data-stagger={Math.min(index, 11)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(product)}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(product)
        }
      } : undefined}
      className="shop-bento shop-grid-item group relative p-3 flex flex-col gap-2 cursor-pointer"
      data-clickable={onClick ? 'true' : undefined}
    >
      {/* Foto / placeholder con aspect-ratio para evitar CLS */}
      <div
        ref={imageRef}
        className="relative rounded-xl overflow-hidden flex items-center justify-center"
        style={{
          aspectRatio: '16 / 11',
          background: `linear-gradient(135deg,
            color-mix(in srgb, ${categoryColor(product.category)} 18%, var(--color-card)) 0%,
            color-mix(in srgb, ${categoryColor(product.category)} 6%, var(--color-card)) 100%)`,
          border: '1px solid color-mix(in srgb, var(--color-border) 60%, transparent)',
        }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <ProductPlaceholder category={product.category} name={product.name} />
        )}

        {/* Indicador de tendencia top-right */}
        {trend !== 'flat' && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              width: 22, height: 22,
              background: trend === 'down' ? 'var(--color-income)' : 'var(--color-expense)',
              color: 'white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
            title={trend === 'down' ? 'Bajada de precio' : 'Subida de precio'}
          >
            {trend === 'down' ? '↓' : '↑'}
          </span>
        )}

        {/* Toggle bookmark top-left */}
        {onToggleTrack && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleTrack(product) }}
            aria-pressed={tracked ?? false}
            aria-label={tracked ? 'Dejar de seguir' : 'Seguir este producto'}
            title={tracked ? 'Siguiendo — click para dejar de seguir' : 'Click para seguir este producto'}
            className="absolute top-2 left-2 inline-flex items-center justify-center cursor-pointer"
            style={{
              width: 26, height: 26,
              borderRadius: 8,
              background: tracked ? 'var(--shop-accent)' : 'rgba(255,255,255,0.85)',
              color: tracked ? 'white' : 'var(--color-subtext)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'background-color var(--duration-fast) var(--ease-default), transform var(--duration-base) var(--ease-spring)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={tracked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2">
          {product.name}
        </h3>
        <p className="text-[11px] text-subtext mt-0.5 truncate">
          {[product.brand, product.format].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Precio mínimo + sparkline */}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          {min ? (
            <PriceTag
              price={min.price}
              isMin
              size="md"
            />
          ) : (
            <span className="text-xs text-subtext italic">Sin disponibilidad</span>
          )}
        </div>
        {historyValues.length >= 2 && (
          <SparklineMini
            values={historyValues}
            width={56}
            height={20}
            stroke={1.5}
            trend={trend}
            ariaLabel={`Histórico de precio: tendencia ${trend === 'down' ? 'a la baja' : trend === 'up' ? 'al alza' : 'estable'}`}
          />
        )}
      </div>

      {/* Disponibilidad por super (dots) */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60">
        <div className="flex items-center gap-1" aria-label="Disponibilidad por supermercado">
          {SUPERMARKET_ORDER.map(id => {
            const sp = product.prices.find(p => p.supermarket === id)
            const available = sp?.available ?? false
            return (
              <span
                key={id}
                title={`${id}: ${available ? `${sp!.price.toFixed(2)} €` : 'No disponible'}`}
                aria-label={`${id}: ${available ? 'disponible' : 'no disponible'}`}
                className="rounded-full transition-transform"
                style={{
                  width: 8, height: 8,
                  background: available
                    ? `var(--super-${id})`
                    : 'color-mix(in srgb, var(--color-subtext) 30%, transparent)',
                  opacity: available ? 1 : 0.5,
                }}
              />
            )
          })}
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Añadir ${product.name} a la lista`}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 inline-flex items-center justify-center rounded-full text-white shrink-0"
            style={{
              width: 28, height: 28,
              background: 'var(--shop-primary)',
              boxShadow: '0 4px 10px color-mix(in srgb, var(--shop-primary) 40%, transparent)',
              transition: 'opacity var(--duration-base) var(--ease-default), transform var(--duration-base) var(--ease-spring)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder de imagen — color por categoría + inicial monograma
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Lácteos:   '#5DA9E9',
  Frutas:    '#F5B14D',
  Verduras:  '#6FD3A8',
  Panes:     '#C97259',
  Carnes:    '#E25C5C',
  Pescados:  '#5BA0CB',
  Bebidas:   '#8676FF',
  Limpieza:  '#A2C4F0',
  Higiene:   '#F09EBB',
  Despensa:  '#C9A84C',
  Congelados:'#B5D5E8',
  Snacks:    '#FF8C73',
}

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'var(--color-accent)'
}

function ProductPlaceholder({ category, name }: { category: string; name: string }) {
  // Inicial mostrada (skip palabras de relleno de 1-2 letras)
  const initial = (name.match(/[A-ZÁÉÍÓÚÑ]/i)?.[0] ?? name[0] ?? '?').toUpperCase()
  const color = categoryColor(category)
  return (
    <div
      className="w-full h-full flex items-center justify-center relative"
      aria-hidden="true"
    >
      {/* Halo central */}
      <div
        className="absolute"
        style={{
          width: '60%', height: '60%',
          borderRadius: '50%',
          background: `radial-gradient(circle, color-mix(in srgb, ${color} 40%, transparent) 0%, transparent 70%)`,
        }}
      />
      {/* Inicial */}
      <span
        className="relative font-bold tracking-tight"
        style={{
          fontSize: '2.5rem',
          fontFamily: 'var(--font-display)',
          color: `color-mix(in srgb, ${color} 85%, var(--color-text))`,
          textShadow: '0 1px 2px rgba(255,255,255,0.4)',
        }}
      >
        {initial}
      </span>
    </div>
  )
}
