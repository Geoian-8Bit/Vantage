import 'server-only'

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

type DbType = PostgresJsDatabase<typeof schema>

let cached: DbType | undefined

function getDb(): DbType {
  if (!cached) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL no está definido. Configúralo en .env.local (local) o en las env vars del runtime (Vercel).'
      )
    }
    const client = postgres(connectionString, { prepare: false, max: 1 })
    cached = drizzle(client, { schema })
  }
  return cached
}

/**
 * Cliente Drizzle perezoso: la conexión a Postgres se crea en la primera
 * propiedad accedida. Esto permite que `next build` cargue el módulo sin
 * DATABASE_URL (no se conecta a nada durante build).
 *
 * Uso normal: `import { db } from '@/db/client'` y `await db.select()...`.
 */
export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})

export { schema }
