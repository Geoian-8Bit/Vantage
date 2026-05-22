import { type NextRequest } from 'next/server'
import { sql } from 'drizzle-orm'

import { db } from '@/db/client'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Vercel Cron cada 6h. Resetea el space demo a sus datos seed y purga las
 * cuentas anonymous con +7 días.
 *
 * Auth: Vercel inyecta `Authorization: Bearer ${CRON_SECRET}` cuando lo
 * dispara su scheduler. Sin secret válido devuelve 401.
 *
 * Las dos funciones SQL viven en el schema `private` (no expuestas vía
 * PostgREST) y solo son ejecutables por service_role. La conexión de Drizzle
 * usa DATABASE_URL como postgres role (BYPASSRLS) así que pueden invocarse
 * desde aquí.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return new Response('CRON_SECRET no configurado', { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const resetResult = await db.execute(sql`SELECT private.reset_demo_space() AS data`)
    const cleanupResult = await db.execute(sql`SELECT private.cleanup_anonymous_users() AS data`)

    return Response.json({
      data: {
        reset: (resetResult as unknown as Array<{ data: unknown }>)[0]?.data,
        cleanup: (cleanupResult as unknown as Array<{ data: unknown }>)[0]?.data,
      },
    })
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
