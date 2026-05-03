import { MOCK_PRODUCTS } from '../screens/shopping/mockData'
import { shoppingRepository } from '../repositories'
import type { SnapshotPayload } from '../repositories/ShoppingRepository'
import type { SupermarketId } from '../../shared/types'

/**
 * Siembra inicial del módulo Compras la primera vez que el usuario lo abre.
 * Inserta los productos mock como items + skus + 90 días de snapshots.
 *
 * Es idempotente vía settings.seeded_at: si ya está seteado, no hace nada.
 * Devuelve el número de items sembrados.
 *
 * Se ejecuta en background tras el primer mount; no bloquea el render. Si
 * falla (ej. desconexión IPC), se registra en consola y la próxima apertura
 * lo reintentará automáticamente.
 */
export async function seedShoppingDbIfNeeded(): Promise<{ seeded: boolean; itemCount: number }> {
  const settings = await shoppingRepository.getSettings()
  if (settings.seeded_at) {
    return { seeded: false, itemCount: 0 }
  }

  // Crear items + SKUs en paralelo de a tandas (sql.js es single-thread, sin
  // ganancia real, pero el helper await Promise.all simplifica el flujo).
  for (const p of MOCK_PRODUCTS) {
    const skus = p.prices
      .filter(x => x.available)
      .map(x => ({
        supermarket: x.supermarket,
        sku: `${x.supermarket}-${p.id}`,        // sku ficticio del seed
        product_name: p.name,
        product_url: null,
        image_url: null,
      }))
    await shoppingRepository.createItem({
      id: p.id,                                 // mantenemos los IDs del mock para consistencia
      name: p.name,
      brand: p.brand ?? null,
      category: p.category,
      format: p.format,
      image_url: null,
      skus,
    })
  }

  // Snapshots: convertir el histórico mock a SnapshotPayload[] y enviarlo en
  // bloques (la BBDD soporta inserts de 1000+ sin problema, pero reducimos el
  // payload IPC partiéndolo para no bloquear).
  const allSnapshots: SnapshotPayload[] = []
  for (const p of MOCK_PRODUCTS) {
    for (const point of p.history) {
      for (const [sup, price] of Object.entries(point.prices)) {
        if (typeof price !== 'number') continue
        allSnapshots.push({
          supermarket: sup as SupermarketId,
          sku: `${sup}-${p.id}`,
          postal_code: null,
          price,
          unit_price: null,
          in_stock: true,
          captured_at: point.date,
        })
      }
    }
  }
  // Bloques de 500 snapshots para ir mostrando progreso si fuera necesario
  const CHUNK = 500
  for (let i = 0; i < allSnapshots.length; i += CHUNK) {
    await shoppingRepository.addSnapshots(allSnapshots.slice(i, i + CHUNK))
  }

  // Marcar como sembrado
  await shoppingRepository.saveSettings({ seeded_at: new Date().toISOString() })

  return { seeded: true, itemCount: MOCK_PRODUCTS.length }
}
