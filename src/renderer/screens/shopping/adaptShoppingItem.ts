import type { ShoppingItemWithPrices } from '../../../shared/types'
import type { ShoppingProduct, PricePoint } from '../../components/shopping/types'

/**
 * Adapter ShoppingItemWithPrices (BBDD) → ShoppingProduct (tipo de los
 * componentes shopping, heredado del Sprint 2 mock). Permite que ProductCard,
 * SparklineMini, getMinPrice y getTrend sigan funcionando sin cambios.
 *
 * Conversión clave: recent_min (precio mínimo agregado por día) se traduce a
 * history como un único super virtual — getTrend del componente busca min de
 * point.prices, así que la silueta sale igual.
 */
export function adaptItemToProduct(it: ShoppingItemWithPrices): ShoppingProduct {
  const history: PricePoint[] = it.recent_min.map(p => ({
    date: p.date,
    // Empaquetamos el min en mercadona; getTrend hace Math.min sobre los valores numéricos
    // así que cualquier clave funcionaría. Usamos mercadona porque siempre existe en la enum.
    prices: { mercadona: p.price },
  }))

  return {
    id: it.item.id,
    name: it.item.name,
    brand: it.item.brand ?? undefined,
    category: it.item.category,
    format: it.item.format ?? '',
    imageUrl: it.item.image_url ?? undefined,
    prices: it.prices.map(p => ({
      supermarket: p.supermarket,
      price: p.price,
      available: p.available,
      changePct: p.change_pct ?? undefined,
    })),
    history,
  }
}
